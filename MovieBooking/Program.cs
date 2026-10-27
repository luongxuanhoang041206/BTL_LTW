using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Hubs;
using MovieBooking.Services;
using MovieBooking.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Cấu hình CORS cho phép React FE (booking_ticket) gọi API
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Cần cho session/cookie
    });
});

builder.Services.AddDbContext<MovieBookingContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Đăng ký Service Layer vào DI Container với vòng đời Scoped
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMovieService, MovieService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IFoodService, FoodService>();
builder.Services.AddScoped<ICinemaService, CinemaService>();
builder.Services.AddScoped<IGenreService, GenreService>();

builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(60);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(new
        {
            title = "Đã xảy ra lỗi máy chủ.",
            status = StatusCodes.Status500InternalServerError,
            requestId = context.TraceIdentifier
        });
    }));
    app.UseHsts();
}

// Chạy DataSeeder khi ở môi trường Development
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<MovieBookingContext>();
    DataSeeder.Seed(context);
}

app.UseHttpsRedirection();
// Serve the React build and other files from wwwroot.
app.UseStaticFiles();
app.UseRouting();

app.UseCors("ReactFrontend");

// Cấu hình Session trước UseAuthorization và trước khi map route
app.UseSession();
app.UseAuthorization();

app.MapControllers();

app.MapHub<SeatHub>("/seatHub");

// React Router handles client-side routes. Keep unknown API and legacy paths as 404s.
app.MapFallback(async context =>
{
    var path = context.Request.Path;
    if (path.StartsWithSegments("/api") || path.StartsWithSegments("/seatHub"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.SendFileAsync(
        Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "app", "index.html"));
});

app.Run();
