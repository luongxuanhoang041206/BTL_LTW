# MovieBooking frontend

Frontend React dùng Vite trong lúc phát triển và được ASP.NET Core phục vụ khi chạy ứng dụng.

## Phát triển

1. Chạy backend ASP.NET tại `http://localhost:5080` bằng profile `http` trong `MovieBooking/Properties/launchSettings.json`.
2. Trong thư mục này, chạy `npm ci` lần đầu rồi `npm run dev`.
3. Mở URL Vite hiển thị trong terminal. Các request `/api` và `/seatHub` được proxy sang backend.

## Build và chạy cùng ASP.NET

Chạy `dotnet run` hoặc `dotnet publish` cho project `MovieBooking`. MSBuild tự build React vào `MovieBooking/wwwroot/app`; ASP.NET phục vụ React Router, API và asset từ cùng origin. Giao diện được render bởi React; ASP.NET MVC controllers chỉ trả dữ liệu/trạng thái HTTP.
