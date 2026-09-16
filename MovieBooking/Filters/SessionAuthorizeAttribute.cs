using System;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace MovieBooking.Filters;

/// <summary>
/// Attribute kiểm tra đăng nhập qua HttpContext.Session.
/// Nếu chưa đăng nhập (Session["UserId"] == null) -> redirect về Auth/Login.
/// Nếu có chỉ định Role -> kiểm tra Session["Role"].
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public class SessionAuthorizeAttribute : ActionFilterAttribute
{
    public string? Role { get; set; }

    public SessionAuthorizeAttribute()
    {
    }

    public SessionAuthorizeAttribute(string role)
    {
        Role = role;
    }

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        var session = context.HttpContext.Session;
        var userId = session.GetInt32("UserId");

        if (userId == null)
        {
            var returnUrl = context.HttpContext.Request.Path + context.HttpContext.Request.QueryString;
            context.Result = new RedirectToActionResult("Login", "Auth", new { returnUrl });
            return;
        }

        if (!string.IsNullOrWhiteSpace(Role))
        {
            var userRole = session.GetString("Role");
            if (string.IsNullOrEmpty(userRole) || !string.Equals(userRole, Role, StringComparison.OrdinalIgnoreCase))
            {
                context.Result = new RedirectToActionResult("AccessDenied", "Auth", null);
                return;
            }
        }

        base.OnActionExecuting(context);
    }
}

/// <summary>
/// Attribute tiện ích để chặn Action/Controller theo Role (ví dụ: [SessionAuthorizeRole("Admin")]).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public class SessionAuthorizeRoleAttribute : SessionAuthorizeAttribute
{
    public SessionAuthorizeRoleAttribute(string role) : base(role)
    {
    }
}
