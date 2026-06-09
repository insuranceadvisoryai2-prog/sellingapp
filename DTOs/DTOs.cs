namespace ECommerce.DTOs;

// ──────────────────────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────────────────────
public record RegisterRequest(
    string Username,
    string Email,
    string Password
);

public record LoginRequest(
    string Username,
    string Password
);

public record AuthResponse(
    string Token,
    string Username,
    string Email,
    string Role,
    DateTime ExpiresAt
);

// ──────────────────────────────────────────────────────────────
// PRODUCT
// ──────────────────────────────────────────────────────────────
public record ProductResponse(
    Guid   Id,
    string Name,
    string? Description,
    decimal Price,
    int    Stock,
    string? ImageUrl,
    string? Category,
    bool   IsActive,
    bool   IsPublished,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateProductRequest(
    string  Name,
    string? Description,
    decimal Price,
    int     Stock,
    string? ImageUrl,
    string? Category,
    bool    IsPublished = false
);

public record UpdateProductRequest(
    string? Name,
    string? Description,
    decimal? Price,
    int?    Stock,
    string? ImageUrl,
    string? Category,
    bool?   IsActive,
    bool?   IsPublished
);

// ──────────────────────────────────────────────────────────────
// CART
// ──────────────────────────────────────────────────────────────
public record AddToCartRequest(
    Guid ProductId,
    int  Quantity
);

public record UpdateCartItemRequest(
    int Quantity
);

public record CartItemResponse(
    Guid    CartItemId,
    Guid    ProductId,
    string  ProductName,
    string? ProductImageUrl,
    decimal UnitPrice,
    int     Quantity,
    decimal LineTotal
);

public record CartResponse(
    Guid   CartId,
    Guid   UserId,
    List<CartItemResponse> Items,
    decimal GrandTotal
);

// ──────────────────────────────────────────────────────────────
// ORDER
// ──────────────────────────────────────────────────────────────
public record CreateOrderRequest(
    string? Notes
);

public record OrderDetailResponse(
    Guid    OrderDetailId,
    Guid    ProductId,
    string  ProductName,
    int     Quantity,
    decimal UnitPrice,
    decimal LineTotal
);

public record OrderResponse(
    Guid   Id,
    Guid   UserId,
    string Status,
    decimal TotalAmount,
    string? Notes,
    DateTime CreatedAt,
    List<OrderDetailResponse> Details
);

public record UpdateOrderStatusRequest(
    string Status
);

// ──────────────────────────────────────────────────────────────
// GENERIC
// ──────────────────────────────────────────────────────────────
public record ApiResponse<T>(bool Success, string? Message, T? Data);
public record ApiError(bool Success, string Message);
