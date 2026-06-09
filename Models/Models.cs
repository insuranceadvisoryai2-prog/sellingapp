using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ECommerce.Models;

// ──────────────────────────────────────────────────────────────
// USER
// ──────────────────────────────────────────────────────────────
public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Role { get; set; } = "Customer"; // "Admin" | "Customer"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Cart? Cart { get; set; }
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

// ──────────────────────────────────────────────────────────────
// PRODUCT
// ──────────────────────────────────────────────────────────────
public class Product
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Column(TypeName = "numeric(18,2)")]
    public decimal Price { get; set; }

    public int Stock { get; set; } = 0;

    public string? ImageUrl { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsPublished { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}

// ──────────────────────────────────────────────────────────────
// CART
// ──────────────────────────────────────────────────────────────
public class Cart
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
}

// ──────────────────────────────────────────────────────────────
// CART ITEM
// ──────────────────────────────────────────────────────────────
public class CartItem
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid CartId { get; set; }

    [Required]
    public Guid ProductId { get; set; }

    public int Quantity { get; set; } = 1;

    [Column(TypeName = "numeric(18,2)")]
    public decimal UnitPrice { get; set; }  // price snapshot at add-time

    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Cart Cart { get; set; } = null!;
    public Product Product { get; set; } = null!;
}

// ──────────────────────────────────────────────────────────────
// ORDER
// ──────────────────────────────────────────────────────────────
public class Order
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Pending";
    // Pending | Confirmed | Processing | Shipped | Delivered | Cancelled

    [Column(TypeName = "numeric(18,2)")]
    public decimal TotalAmount { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}

// ──────────────────────────────────────────────────────────────
// ORDER DETAIL
// ──────────────────────────────────────────────────────────────
public class OrderDetail
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid OrderId { get; set; }

    [Required]
    public Guid ProductId { get; set; }

    [Required, MaxLength(255)]
    public string ProductName { get; set; } = string.Empty;  // snapshot

    public int Quantity { get; set; }

    [Column(TypeName = "numeric(18,2)")]
    public decimal UnitPrice { get; set; }  // snapshot

    [Column(TypeName = "numeric(18,2)")]
    public decimal LineTotal => Quantity * UnitPrice;

    // Navigation
    public Order Order { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
