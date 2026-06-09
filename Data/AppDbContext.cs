using ECommerce.Models;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User>        Users        => Set<User>();
    public DbSet<Product>     Products     => Set<Product>();
    public DbSet<Cart>        Carts        => Set<Cart>();
    public DbSet<CartItem>    CartItems    => Set<CartItem>();
    public DbSet<Order>       Orders       => Set<Order>();
    public DbSet<OrderDetail> OrderDetails => Set<OrderDetail>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasDefaultValue("Customer");
        });

        // ── Product ─────────────────────────────────────────────
        modelBuilder.Entity<Product>(e =>
        {
            e.HasIndex(p => new { p.IsActive, p.IsPublished });
            e.HasIndex(p => p.Category);
            e.Property(p => p.IsActive).HasDefaultValue(true);
            e.Property(p => p.IsPublished).HasDefaultValue(false);
        });

        // ── Cart ─────────────────────────────────────────────────
        modelBuilder.Entity<Cart>(e =>
        {
            e.HasIndex(c => c.UserId).IsUnique();  // one cart per user
            e.HasOne(c => c.User)
             .WithOne(u => u.Cart)
             .HasForeignKey<Cart>(c => c.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── CartItem ─────────────────────────────────────────────
        modelBuilder.Entity<CartItem>(e =>
        {
            e.HasIndex(ci => new { ci.CartId, ci.ProductId }).IsUnique();
            e.HasOne(ci => ci.Cart)
             .WithMany(c => c.CartItems)
             .HasForeignKey(ci => ci.CartId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ci => ci.Product)
             .WithMany(p => p.CartItems)
             .HasForeignKey(ci => ci.ProductId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Order ─────────────────────────────────────────────────
        modelBuilder.Entity<Order>(e =>
        {
            e.HasIndex(o => o.UserId);
            e.HasIndex(o => o.Status);
            e.HasOne(o => o.User)
             .WithMany(u => u.Orders)
             .HasForeignKey(o => o.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── OrderDetail ───────────────────────────────────────────
        modelBuilder.Entity<OrderDetail>(e =>
        {
            e.Ignore(od => od.LineTotal);  // computed — not stored by EF
            e.HasOne(od => od.Order)
             .WithMany(o => o.OrderDetails)
             .HasForeignKey(od => od.OrderId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(od => od.Product)
             .WithMany(p => p.OrderDetails)
             .HasForeignKey(od => od.ProductId)
             .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
