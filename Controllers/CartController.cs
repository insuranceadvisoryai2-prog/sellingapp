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
public class CartController : ControllerBase
{
    private readonly AppDbContext _db;

    public CartController(AppDbContext db) => _db = db;

    // GET /api/cart
    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var userId = User.GetUserId();
        var cart   = await GetOrCreateCartAsync(userId);
        return Ok(new ApiResponse<CartResponse>(true, null, ToResponse(cart)));
    }

    // POST /api/cart/items
    [HttpPost("items")]
    public async Task<IActionResult> AddItem([FromBody] AddToCartRequest req)
    {
        if (req.Quantity <= 0)
            return BadRequest(new ApiError(false, "Quantity must be at least 1."));

        var product = await _db.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == req.ProductId && p.IsActive && p.IsPublished);

        if (product is null)
            return NotFound(new ApiError(false, "Product not found or unavailable."));

        if (product.Stock < req.Quantity)
            return BadRequest(new ApiError(false, $"Only {product.Stock} units in stock."));

        var userId = User.GetUserId();
        var cart   = await GetOrCreateCartAsync(userId);

        var existing = cart.CartItems.FirstOrDefault(ci => ci.ProductId == req.ProductId);
        if (existing is not null)
        {
            var newQty = existing.Quantity + req.Quantity;
            if (newQty > product.Stock)
                return BadRequest(new ApiError(false, $"Only {product.Stock} units in stock."));
            existing.Quantity = newQty;
        }
        else
        {
            cart.CartItems.Add(new CartItem
            {
                CartId    = cart.Id,
                ProductId = product.Id,
                Quantity  = req.Quantity,
                UnitPrice = product.Price
            });
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // reload to get full navigation
        var updated = await GetOrCreateCartAsync(userId);
        return Ok(new ApiResponse<CartResponse>(true, "Item added to cart.", ToResponse(updated)));
    }

    // PUT /api/cart/items/{productId}
    [HttpPut("items/{productId:guid}")]
    public async Task<IActionResult> UpdateItem(Guid productId, [FromBody] UpdateCartItemRequest req)
    {
        if (req.Quantity <= 0)
            return BadRequest(new ApiError(false, "Quantity must be at least 1."));

        var userId = User.GetUserId();
        var cart   = await GetOrCreateCartAsync(userId);

        var item = cart.CartItems.FirstOrDefault(ci => ci.ProductId == productId);
        if (item is null)
            return NotFound(new ApiError(false, "Item not in cart."));

        var stock = await _db.Products
            .AsNoTracking()
            .Where(p => p.Id == productId)
            .Select(p => p.Stock)
            .FirstOrDefaultAsync();

        if (req.Quantity > stock)
            return BadRequest(new ApiError(false, $"Only {stock} units in stock."));

        item.Quantity  = req.Quantity;
        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var updated = await GetOrCreateCartAsync(userId);
        return Ok(new ApiResponse<CartResponse>(true, "Cart updated.", ToResponse(updated)));
    }

    // DELETE /api/cart/items/{productId}
    [HttpDelete("items/{productId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid productId)
    {
        var userId = User.GetUserId();
        var cart   = await _db.Carts
            .Include(c => c.CartItems)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (cart is null)
            return NotFound(new ApiError(false, "Cart not found."));

        var item = cart.CartItems.FirstOrDefault(ci => ci.ProductId == productId);
        if (item is null)
            return NotFound(new ApiError(false, "Item not in cart."));

        _db.CartItems.Remove(item);
        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var updated = await GetOrCreateCartAsync(userId);
        return Ok(new ApiResponse<CartResponse>(true, "Item removed.", ToResponse(updated)));
    }

    // DELETE /api/cart  (clear entire cart)
    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        var userId = User.GetUserId();
        var cart   = await _db.Carts
            .Include(c => c.CartItems)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (cart is null)
            return Ok(new ApiResponse<object>(true, "Cart already empty.", null));

        _db.CartItems.RemoveRange(cart.CartItems);
        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new ApiResponse<object>(true, "Cart cleared.", null));
    }

    // ── HELPERS ──────────────────────────────────────────────────

    private async Task<Cart> GetOrCreateCartAsync(Guid userId)
    {
        var cart = await _db.Carts
            .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Product)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (cart is null)
        {
            cart = new Cart { UserId = userId };
            _db.Carts.Add(cart);
            await _db.SaveChangesAsync();
        }

        return cart;
    }

    private static CartResponse ToResponse(Cart cart)
    {
        var items = cart.CartItems.Select(ci => new CartItemResponse(
            ci.Id,
            ci.ProductId,
            ci.Product?.Name ?? "Unknown",
            ci.Product?.ImageUrl,
            ci.UnitPrice,
            ci.Quantity,
            ci.UnitPrice * ci.Quantity
        )).ToList();

        return new CartResponse(
            cart.Id,
            cart.UserId,
            items,
            items.Sum(i => i.LineTotal)
        );
    }
}
