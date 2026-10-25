# DANH SÁCH BÁO CÁO CÔNG VIỆC VÀ CÁC MỤC CẦN HOÀN THIỆN (ADMIN MODULE)

Tài liệu này tổng hợp tình trạng hoàn thiện của toàn bộ các phân hệ trong module Quản trị (Admin) của dự án **MovieBooking** theo đúng cấu trúc Sidebar thực tế.

---

## I. TỔNG QUAN TÌNH TRẠNG CÁC PHÂN HỆ ADMIN

| STT | Phân hệ (Sidebar) | Đường dẫn Route | Frontend (React) | Backend API | Kết nối Database thực tế |
|---|---|---|---|---|---|
| **1** | **Bảng điều khiển** | `/admin`, `/admin/dashboard` | ✅ Hoàn thiện | ✅ `GET /api/admin/dashboard` | ✅ `Bookings`, `Showtimes`, `Users` |
| **2** | **Danh sách phim** | `/admin/movies` | ✅ Hoàn thiện | ✅ CRUD `/api/admin/movies` | ✅ `Movies`, `MovieGenres` |
| **3** | **Thể loại phim** | `/admin/genres` | ✅ Hoàn thiện | ✅ CRUD `/api/admin/genres` | ✅ `Genres` |
| **4** | **Danh sách rạp** | `/admin/cinemas` | ✅ Hoàn thiện | ✅ CRUD `/api/admin/cinemas` | ✅ `Cinemas`, `Rooms` |
| **5** | **Phòng chiếu** | `/admin/rooms` | ✅ Hoàn thiện | ✅ CRUD `/api/admin/rooms` | ✅ `Rooms`, `Cinemas`, `Seats` |
| **6** | **Sơ đồ ghế** | `/admin/seat-map` | ✅ Hoàn thiện | ✅ `/api/admin/rooms/{id}/seats`<br>✅ Toggle/Type/Batch-generate | ✅ `Seats`, `Rooms` |
| **7** | **Lịch chiếu** | `/admin/shows`, `/admin/list-shows`, `/admin/add-shows` | ✅ Hoàn thiện | ✅ CRUD `/api/admin/shows` | ✅ `Showtimes`, `ShowtimeSeats` |
| **8** | **Đặt vé** | `/admin/bookings`, `/admin/list-bookings` | ✅ Hoàn thiện | ✅ `GET /api/admin/bookings` | ✅ `Bookings`, `BookingDetails` |
| **9** | **Thanh toán** | `/admin/payments` | ✅ Hoàn thiện | ✅ `GET /api/admin/payments`<br>✅ `POST /api/admin/payments/{id}/verify` | ✅ `Payments`, `BankTransactions` |
| **10**| **Khuyến mãi** | `/admin/promotions` | ✅ Hoàn thiện | ✅ CRUD `/api/admin/promotions` | ✅ `Promotions`, `Bookings` |
| **11**| **Khách hàng** | `/admin/customers` | ✅ Hoàn thiện | ✅ `GET /api/admin/customers`<br>✅ Toggle status & Xem lịch sử | ✅ `Users` (Role="Customer") |
| **12**| **Đánh giá phim** | `/admin/reviews` | ✅ Hoàn thiện | ✅ `GET /api/admin/reviews`<br>✅ `DELETE /api/admin/reviews/{id}` | ✅ `Reviews`, `Movies`, `Users` |
| **13**| **Báo cáo doanh thu** | `/admin/reports/revenue` | ✅ Hoàn thiện | ✅ `GET /api/admin/analytics/revenue` | ✅ Tổng hợp từ `Bookings`, `Payments` |
| **14**| **Hiệu suất suất chiếu** | `/admin/reports/showtime-performance` | ✅ Hoàn thiện | ✅ `GET /api/admin/analytics/showtime-performance` | ✅ Tổng hợp từ `Showtimes`, `ShowtimeSeats` |
| **15**| **Tỷ lệ lấp đầy ghế** | `/admin/reports/seat-occupancy` | ✅ Hoàn thiện | ✅ `GET /api/admin/analytics/seat-occupancy` | ✅ Tổng hợp từ `Rooms`, `Showtimes` |
| **16**| **Tài khoản quản trị** | `/admin/system/users` | ✅ Hoàn thiện | ✅ `GET/POST/PUT /api/admin/system/users` | ✅ `Users` (Role="Admin" / "Staff") |
| **17**| **Phân quyền** | `/admin/system/roles` | ✅ Hoàn thiện | ✅ `GET /api/admin/system/roles` | ⚠️ RBAC theo enum Role (`Admin`/`Staff`/`Customer`) |
| **18**| **Nhật ký quản trị** | `/admin/system/audit-logs` | ✅ Hoàn thiện | ✅ `GET /api/admin/system/audit-logs` | ⚠️ Truy vấn tổng hợp từ các sự kiện `Bookings`, `Payments` |
| **19**| **Cấu hình hệ thống**| `/admin/system/settings` | ✅ Hoàn thiện | ✅ `GET/POST /api/admin/system/settings` | ⚠️ Bộ nhớ cấu hình tĩnh (In-memory cache) |

---

## II. CÁC MỤC DATABASE CÓ THỂ MỞ RỘNG (NẾU BẠN MUỐN TẠO MIGRATION SAU NÀY)

Theo yêu cầu của bạn: *"nếu phần nào đó thiếu 1 cái gì đó bên db hoặc 1 cái gì đó để hoàn thành thì hoàn thiện FE rồi lưu phần việc cần hoàn thành đấy vào 1 file để tôi xem xét sau"*.

Dưới đây là 3 bảng cơ sở dữ liệu đề xuất nếu bạn muốn lưu trữ cố định nhật ký, phân quyền tùy biến và cấu hình toàn hệ thống vào SQL Server:

### 1. Bảng `SystemSettings` (Cấu hình hệ thống)
- **Hiện tại**: Frontend đã hoàn thiện giao diện cài đặt (Thời gian giữ ghế, giá vé mặc định, phụ thu VIP, email hotline, chế độ bảo trì). Backend đang lưu trong `_systemSettings` bộ nhớ đệm.
- **Đề xuất Database Table**:
```sql
CREATE TABLE [dbo].[SystemSettings] (
    [SettingId] INT IDENTITY(1,1) PRIMARY KEY,
    [SettingKey] VARCHAR(50) NOT NULL UNIQUE,
    [SettingValue] NVARCHAR(MAX) NOT NULL,
    [Description] NVARCHAR(255) NULL,
    [UpdatedAt] DATETIME DEFAULT GETDATE()
);

-- Dữ liệu mẫu khởi tạo:
INSERT INTO [SystemSettings] ([SettingKey], [SettingValue], [Description]) VALUES
('BrandName', N'RoPhim Cinema', N'Tên thương hiệu hệ thống'),
('SeatHoldMinutes', '10', N'Số phút giữ ghế tạm thời'),
('DefaultTicketPrice', '75000', N'Giá vé mặc định ban đầu'),
('VipPriceMultiplier', '1.2', N'Hệ số phụ thu ghế VIP'),
('CustomerSupportEmail', 'support@moviebooking.com', N'Email CSKH'),
('CustomerSupportPhone', '1900 1234', N'Hotline CSKH'),
('AllowOnlineCancellation', 'true', N'Cho phép khách hủy vé online'),
('MaintenanceMode', 'false', N'Chế độ bảo trì hệ thống');
```

---

### 2. Bảng `AuditLogs` (Nhật ký quản trị chuyên sâu)
- **Hiện tại**: Frontend đã hoàn thiện bảng theo dõi nhật ký hoạt động. Backend đang tổng hợp từ các bản ghi giao dịch thanh toán và đơn đặt vé mới nhất trong DB.
- **Đề xuất Database Table**:
```sql
CREATE TABLE [dbo].[AuditLogs] (
    [LogId] INT IDENTITY(1,1) PRIMARY KEY,
    [UserId] INT NULL,
    [Action] NVARCHAR(100) NOT NULL,
    [Target] NVARCHAR(100) NULL,
    [Details] NVARCHAR(500) NULL,
    [Status] VARCHAR(20) DEFAULT 'Success',
    [IpAddress] VARCHAR(45) NULL,
    [CreatedAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT [FK_AuditLogs_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([UserId]) ON DELETE SET NULL
);
```

---

### 3. Bảng `Permissions` & `RolePermissions` (Phân quyền động nhiều cấp)
- **Hiện tại**: Hệ thống phân quyền cố định theo 3 cấp độ (`Admin`, `Staff`, `Customer`) qua thuộc tính `Role` trong bảng `Users`. Frontend đã hiển thị đầy đủ ma trận quyền hạn cho từng vai trò.
- **Đề xuất Database Table** (khi muốn Admin tự tích chọn quyền cho từng Staff):
```sql
CREATE TABLE [dbo].[Permissions] (
    [PermissionId] INT IDENTITY(1,1) PRIMARY KEY,
    [PermissionCode] VARCHAR(50) NOT NULL UNIQUE,
    [PermissionName] NVARCHAR(100) NOT NULL,
    [Group] NVARCHAR(50) NOT NULL
);

CREATE TABLE [dbo].[RolePermissions] (
    [RoleName] VARCHAR(20) NOT NULL,
    [PermissionId] INT NOT NULL,
    PRIMARY KEY ([RoleName], [PermissionId]),
    CONSTRAINT [FK_RolePermissions_Permission] FOREIGN KEY ([PermissionId]) REFERENCES [Permissions]([PermissionId]) ON DELETE CASCADE
);
```

---

## III. HƯỚNG DẪN KHỞI CHẠY KIỂM THỬ

### 1. Khởi chạy Backend ASP.NET Core MVC / Web API:
```powershell
cd d:\BTL_LTW\MovieBooking
dotnet run
```
Backend sẽ lắng nghe tại `http://localhost:5080` (hoặc cổng cấu hình trong `launchSettings.json`).

### 2. Khởi chạy Frontend React:
```powershell
cd d:\BTL_LTW\booking_ticket
npm run dev
```
Truy cập ứng dụng tại `http://localhost:5173/admin`.

### 3. Tài khoản đăng nhập Admin mặc định:
- **Email**: `admin@moviebooking.com`
- **Mật khẩu**: `Admin@123`
