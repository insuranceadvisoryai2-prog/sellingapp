using ECommerce.Data;
using ECommerce.DTOs;
using ECommerce.Helpers;
using ECommerce.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<OrdersController> _log;

    public OrdersController(AppDbContext db, ILogger<OrdersController> log)
    {
        _db  = db;
        _log = log;
    }

    // POST /api/orders  — checkout: converts cart → order
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest req)
    {
        var userId = User.GetUserId();

        // Load cart with items + products in one query
        var cart = await _db.Carts
            .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Product)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (cart is null || !cart.CartItems.Any())
            return BadRequest(new ApiError(false, "Your cart is empty."));

        // Validate stock for every item
        var stockErrors = new List<string>();
        foreach (var item in cart.CartItems)
        {
            if (item.Product is null || !item.Product.IsActive || !item.Product.IsPublished)
            {
                stockErrors.Add($"'{item.Product?.Name ?? item.ProductId.ToString()}' is no longer available.");
                continue;
            }
            if (item.Product.Stock < item.Quantity)
                stockErrors.Add($"'{item.Product.Name}': only {item.Product.Stock} units left.");
        }

        if (stockErrors.Any())
            return BadRequest(new ApiError(false, string.Join(" | ", stockErrors)));

        // Use a transaction: order + deduct stock + clear cart atomically
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var order = new Order
            {
                UserId      = userId,
                Status      = "Pending",
                Notes       = req.Notes,
                TotalAmount = cart.CartItems.Sum(ci => ci.UnitPrice * ci.Quantity)
            };
            _db.Orders.Add(order);
            await _db.SaveChangesAsync();  // get order.Id

            foreach (var item in cart.CartItems)
            {
                // Snapshot product name + price at order time
                _db.OrderDetails.Add(new OrderDetail
                {
                    OrderId     = order.Id,
                    ProductId   = item.ProductId,
                    ProductName = item.Product!.Name,
                    Quantity    = item.Quantity,
                    UnitPrice   = item.UnitPrice
                });

                // Deduct stock
                item.Product.Stock -= item.Quantity;
                item.Product.UpdatedAt = DateTime.UtcNow;
            }

            // Clear cart items (keep cart row for next purchase)
            _db.CartItems.RemoveRange(cart.CartItems);
            cart.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            _log.LogInformation("Order created: {OrderId} for user {UserId}", order.Id, userId);

            // Reload to return full details
            var created = await LoadOrderAsync(order.Id, userId);
            return CreatedAtAction(nameof(GetById), new { id = order.Id },
                new ApiResponse<OrderResponse>(true, "Order placed successfully.", created));
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _log.LogError(ex, "Order creation failed for user {UserId}", userId);
            return StatusCode(500, new ApiError(false, "Order could not be placed. Please try again."));
        }
    }

    // GET /api/orders  — current user's orders
    [HttpGet]
    public async Task<IActionResult> GetMyOrders(
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 10)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page     = Math.Max(1, page);

        var userId = User.GetUserId();
        var query  = _db.Orders.AsNoTracking().Where(o => o.UserId == userId);
        var total  = await query.CountAsync();

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(o => o.OrderDetails)
            .Select(o => ToResponse(o))
            .ToListAsync();

        return Ok(new { Success = true, Data = orders, Total = total, Page = page });
    }

    // GET /api/orders/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userId = User.GetUserId();
        var role   = User.GetRole();

        // Admins can see any order; customers only their own
        var order = role == "Admin"
            ? await LoadOrderAsync(id, null)
            : await LoadOrderAsync(id, userId);

        if (order is null)
            return NotFound(new ApiError(false, "Order not found."));

        return Ok(new ApiResponse<OrderResponse>(true, null, order));
    }

    // PATCH /api/orders/{id}/status  (Admin only)
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest req)
    {
        var valid = new[] { "Pending","Confirmed","Processing","Shipped","Delivered","Cancelled" };
        if (!valid.Contains(req.Status))
            return BadRequest(new ApiError(false, $"Invalid status. Valid values: {string.Join(", ", valid)}"));

        var order = await _db.Orders.FindAsync(id);
        if (order is null)
            return NotFound(new ApiError(false, "Order not found."));

        order.Status    = req.Status;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _log.LogInformation("Order {OrderId} status → {Status}", id, req.Status);
        return Ok(new ApiResponse<object>(true, $"Order status updated to {req.Status}.", null));
    }

    // GET /api/orders/admin/all  (Admin)
    [HttpGet("admin/all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminGetAll(
        [FromQuery] string? status,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page     = Math.Max(1, page);

        var query = _db.Orders.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(o => o.Status == status);

        var total  = await query.CountAsync();
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(o => o.OrderDetails)
            .Select(o => ToResponse(o))
            .ToListAsync();

        return Ok(new { Success = true, Data = orders, Total = total, Page = page });
    }

    // ── HELPERS ──────────────────────────────────────────────────

    private async Task<OrderResponse?> LoadOrderAsync(Guid orderId, Guid? userId)
    {
        var query = _db.Orders
            .AsNoTracking()
            .Include(o => o.OrderDetails)
            .Where(o => o.Id == orderId);

        if (userId.HasValue)
            query = query.Where(o => o.UserId == userId.Value);

        return await query
            .Select(o => ToResponse(o))
            .FirstOrDefaultAsync();
    }

    private static OrderResponse ToResponse(Order o) => new(
        o.Id,
        o.UserId,
        o.Status,
        o.TotalAmount,
        o.Notes,
        o.CreatedAt,
        o.OrderDetails.Select(d => new OrderDetailResponse(
            d.Id, d.ProductId, d.ProductName,
            d.Quantity, d.UnitPrice, d.Quantity * d.UnitPrice
        )).ToList()
    );
}
