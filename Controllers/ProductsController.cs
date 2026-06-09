using ECommerce.Data;
using ECommerce.DTOs;
using ECommerce.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<ProductsController> _log;

    public ProductsController(AppDbContext db, ILogger<ProductsController> log)
    {
        _db  = db;
        _log = log;
    }

    // ── PUBLIC ENDPOINTS ────────────────────────────────────────

    // GET /api/products?category=&search=&page=1&pageSize=20
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page     = Math.Max(1, page);

        // ALWAYS query the database — zero static data
        var query = _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive && p.IsPublished);  // only live products

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p =>
                EF.Functions.ILike(p.Name, $"%{search}%") ||
                (p.Description != null && EF.Functions.ILike(p.Description, $"%{search}%")));

        var total    = await query.CountAsync();
        var products = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => ToResponse(p))
            .ToListAsync();

        return Ok(new
        {
            Success    = true,
            Data       = products,
            Total      = total,
            Page       = page,
            PageSize   = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    // GET /api/products/{id}
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id)
    {
        var product = await _db.Products
            .AsNoTracking()
            .Where(p => p.Id == id && p.IsActive && p.IsPublished)
            .Select(p => ToResponse(p))
            .FirstOrDefaultAsync();

        if (product is null)
            return NotFound(new ApiError(false, "Product not found."));

        return Ok(new ApiResponse<ProductResponse>(true, null, product));
    }

    // GET /api/products/categories
    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategories()
    {
        var cats = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive && p.IsPublished && p.Category != null)
            .Select(p => p.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        return Ok(new ApiResponse<List<string>>(true, null, cats));
    }

    // ── ADMIN ENDPOINTS ─────────────────────────────────────────

    // GET /api/products/admin/all  (Admin sees everything)
    [HttpGet("admin/all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminGetAll(
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 50)
    {
        pageSize = Math.Clamp(pageSize, 1, 200);
        page     = Math.Max(1, page);

        var query = _db.Products.AsNoTracking();
        var total = await query.CountAsync();
        var products = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => ToResponse(p))
            .ToListAsync();

        return Ok(new { Success = true, Data = products, Total = total, Page = page });
    }

    // POST /api/products
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new ApiError(false, "Product name is required."));

        if (req.Price < 0)
            return BadRequest(new ApiError(false, "Price cannot be negative."));

        var product = new Product
        {
            Name        = req.Name.Trim(),
            Description = req.Description,
            Price       = req.Price,
            Stock       = req.Stock,
            ImageUrl    = req.ImageUrl,
            Category    = req.Category,
            IsPublished = req.IsPublished,
            IsActive    = true
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        _log.LogInformation("Product created: {Id} {Name}", product.Id, product.Name);
        return CreatedAtAction(nameof(GetById), new { id = product.Id },
            new ApiResponse<ProductResponse>(true, "Product created.", ToResponse(product)));
    }

    // PUT /api/products/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductRequest req)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null)
            return NotFound(new ApiError(false, "Product not found."));

        if (req.Name       is not null) product.Name        = req.Name.Trim();
        if (req.Description is not null) product.Description = req.Description;
        if (req.Price       is not null) product.Price       = req.Price.Value;
        if (req.Stock       is not null) product.Stock       = req.Stock.Value;
        if (req.ImageUrl    is not null) product.ImageUrl    = req.ImageUrl;
        if (req.Category    is not null) product.Category    = req.Category;
        if (req.IsActive    is not null) product.IsActive    = req.IsActive.Value;
        if (req.IsPublished is not null) product.IsPublished = req.IsPublished.Value;
        product.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new ApiResponse<ProductResponse>(true, "Product updated.", ToResponse(product)));
    }

    // DELETE /api/products/{id}  (soft delete)
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null)
            return NotFound(new ApiError(false, "Product not found."));

        product.IsActive    = false;
        product.IsPublished = false;
        product.UpdatedAt   = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        _log.LogInformation("Product soft-deleted: {Id}", id);
        return Ok(new ApiResponse<object>(true, "Product removed from catalog.", null));
    }

    // ── HELPER ──────────────────────────────────────────────────
    private static ProductResponse ToResponse(Product p) => new(
        p.Id, p.Name, p.Description, p.Price, p.Stock,
        p.ImageUrl, p.Category, p.IsActive, p.IsPublished,
        p.CreatedAt, p.UpdatedAt);
}
