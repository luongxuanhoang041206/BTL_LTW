# Kế hoạch Refactor Hệ Thống Theo Mô Hình MVC + React (Cách 1)

Kế hoạch này tích hợp toàn diện dự án **MovieBooking** (ASP.NET Core) và **booking_ticket** (React + Tailwind CSS) thành một hệ thống thống nhất theo chuẩn kiến trúc MVC:
- **Model (M):** CSDL SQL Server, Entity Framework Core, DbContext, Services nghiệp vụ và DTOs trong `MovieBooking`.
- **Controller (C):** ASP.NET Core Controllers xử lý điều hướng, phân quyền, xác thực Session/Cookie và cung cấp các RESTful API endpoints.
- **View (V):** Ứng dụng React đóng vai trò Client-side View (Single Page Application), hiển thị giao diện Dark Mode hiện đại, tương tác thời gian thực không reload trang.

---

## User Review Required

> [!IMPORTANT]
> **1. Thay thế Clerk Auth bằng Hệ thống Đăng nhập / Đăng ký Nội bộ (SQL Server):**
> - Dự án React hiện đang phụ thuộc vào `@clerk/react` (dịch vụ đăng nhập bên thứ 3).
> - Để chuẩn theo đề tài môn học và lưu trữ dữ liệu người dùng trong SQL Server, chúng ta sẽ gỡ bỏ Clerk và xây dựng **Auth Modal / Context nội bộ** (giao diện Dark Neon đồng bộ với RoPhim, hỗ trợ Đăng nhập, Đăng ký, hiển thị thông tin User, Phân quyền Khách hàng / Admin).

> [!NOTE]
> **2. Cấu trúc thư mục dự án:**
> - Dự án React `booking_ticket` có thể được chuyển vào thư mục `MovieBooking/ClientApp` (hoặc giữ nguyên độc lập và kết nối qua CORS trong môi trường dev).
> - Cấu hình build output của React sang `MovieBooking/wwwroot` để khi chạy backend .NET là tự động load giao diện React.

---

## Proposed Changes

### 1. Backend: ASP.NET Core (`MovieBooking`)

#### [MODIFY] [Program.cs](file:///d:/BTL_LTW/MovieBooking/Program.cs)
- Kích hoạt `app.UseCors("ReactFrontend")` trước các middleware định tuyến.
- Cấu hình Cookie Session hỗ trợ `SameSite = SameSiteMode.Lax` và `IsEssential = true` để hỗ trợ gọi API từ React.
- Cấu hình fallback route: khi truy cập các đường dẫn SPA (như `/movies`, `/booking`, `/admin`), server tự động điều hướng về `index.html` của React.

#### [NEW] [ApiControllers](file:///d:/BTL_LTW/MovieBooking/Controllers)
Tạo các API Controllers (hoặc kế thừa mở rộng từ Controllers hiện có) trả về dữ liệu chuẩn JSON:
- `ApiAuthController.cs`:
  - `POST /api/auth/login`: Xác thực tài khoản với BCrypt, thiết lập Session, trả về thông tin user (UserId, FullName, Email, Role).
  - `POST /api/auth/register`: Đăng ký tài khoản mới vào bảng `Users`.
  - `POST /api/auth/logout`: Xóa Session.
  - `GET /api/auth/me`: Kiểm tra trạng thái đăng nhập hiện tại từ Session.
- `ApiMovieController.cs`:
  - `GET /api/movies`: Lấy danh sách phim đang chiếu, sắp chiếu, tìm kiếm, lọc theo thể loại.
  - `GET /api/movies/{id}`: Lấy chi tiết phim (thông tin, đạo diễn, diễn viên, trailer, thời lượng).
  - `GET /api/movies/{id}/showtimes`: Lấy danh sách lịch chiếu của phim nhóm theo ngày.
- `ApiBookingController.cs`:
  - `GET /api/booking/seatmap/{showtimeId}`: Lấy sơ đồ ghế, trạng thái ghế (Trống / Đang giữ / Đã đặt), loại ghế (Thường / VIP).
  - `POST /api/booking/hold`: Giữ ghế tạm thời trong 10 phút.
  - `POST /api/booking/confirm`: Đặt vé và tạo hóa đơn.
  - `GET /api/booking/my-bookings`: Lấy lịch sử đặt vé của user đang đăng nhập.
- `ApiAdminController.cs`:
  - `GET /api/admin/dashboard`: Thống kê tổng vé, doanh thu, suất chiếu hoạt động, tổng user.
  - `GET /api/admin/shows`: Danh sách các suất chiếu.
  - `POST /api/admin/shows`: Thêm suất chiếu mới.
  - `GET /api/admin/bookings`: Quản lý toàn bộ danh sách vé đã đặt.

---

### 2. Frontend: React (`booking_ticket`)

#### [MODIFY] [package.json](file:///d:/BTL_LTW/booking_ticket/package.json)
- Gỡ bỏ thư viện phụ thuộc bên ngoài không cần thiết (`@clerk/react`).

#### [NEW] `src/context/AuthContext.jsx` & `src/components/AuthModal.jsx`
- `AuthContext`: Quản lý trạng thái user (`user`, `login`, `register`, `logout`, `checkAuth`).
- `AuthModal`: Modal đăng nhập & đăng ký đẹp mắt, tích hợp báo lỗi toast, chuyển tab mượt mà.

#### [NEW] `src/lib/api.js`
- Module cấu hình `fetch` gửi kèm cookie (`credentials: 'include'`) và URL trỏ về Backend ASP.NET Core (`http://localhost:5000` hoặc proxy).

#### [MODIFY] [Navbar.jsx](file:///d:/BTL_LTW/booking_ticket/src/components/Navbar.jsx)
- Thay nút Clerk bằng AuthModal, hiển thị Avatar người dùng, nút "Vé của tôi", link chuyển đến "Admin Dashboard" nếu là Admin, và nút Đăng xuất.

#### [MODIFY] Các trang đọc dữ liệu tĩnh sang gọi API thật:
- [Home.jsx](file:///d:/BTL_LTW/booking_ticket/src/pages/Home.jsx), [HeroSection.jsx](file:///d:/BTL_LTW/booking_ticket/src/components/HeroSection.jsx), [FeatureSection.jsx](file:///d:/BTL_LTW/booking_ticket/src/components/FeatureSection.jsx): Lấy danh sách phim thật từ database.
- [Movies.jsx](file:///d:/BTL_LTW/booking_ticket/src/pages/Movies.jsx): Lọc phim theo thể loại, tìm kiếm phim từ API.
- [MovieDetail.jsx](file:///d:/BTL_LTW/booking_ticket/src/pages/MovieDetail.jsx): Hiển thị chi tiết phim, diễn viên, trailer và lịch chiếu từ database.
- [SeatLayout.jsx](file:///d:/BTL_LTW/booking_ticket/src/pages/SeatLayout.jsx): Hiển thị sơ đồ ghế thật theo phòng chiếu, loại ghế, tính giá tiền thật và xử lý giữ ghế.
- [Bookings.jsx](file:///d:/BTL_LTW/booking_ticket/src/pages/Bookings.jsx): Hiển thị danh sách vé đã đặt của user từ backend.
- Các trang admin (`DashBoard.jsx`, `AddShows.jsx`, `ListShows.jsx`, `ListBookings.jsx`): Tích hợp dữ liệu thống kê và quản trị thật.

---

## Verification Plan

### 1. Kiểm tra Backend API:
- Kiểm tra build của `MovieBooking`: `dotnet build`.
- Kiểm tra các endpoint xác thực (Login, Register, Me) qua cURL hoặc test trực tiếp.
- Kiểm tra trả dữ liệu JSON cho Movies, Showtimes, SeatMap.

### 2. Kiểm tra Frontend React:
- Chạy `npm run dev` trong `booking_ticket`.
- Kiểm tra đăng nhập với tài khoản seed mặc định:
  - Admin: `admin@moviebooking.com` / `Admin@123`
  - Customer: `user@moviebooking.com` / `User@123`
- Thử nghiệm quy trình người dùng: Xem phim -> Xem chi tiết -> Chọn ngày giờ -> Chọn ghế -> Xác nhận đặt vé -> Xem lại trong "My Bookings".
- Kiểm tra chức năng Admin: Xem Dashboard, xem danh sách show.
