# Checklist Kiểm thử — Vé điện tử QR & Check-in tại rạp

> Phạm vi: phát hành vé tự động sau thanh toán, API lấy vé, API check-in QR, frontend hiển thị vé QR, frontend quét QR check-in.

## 0. Chuẩn bị & công cụ

- Tài khoản seed sẵn (`DataSeeder`):
  - Admin: `admin@moviebooking.com` / `Admin@123` (Role = `Admin`).
  - Customer: `user@moviebooking.com` / `User@123` (Role = `Customer`).
- Endpoint liên quan:
  - `GET /api/booking/details/{bookingId}` — dữ liệu vé hiển thị (đã bổ sung `tickets[]`).
  - `GET /api/tickets/booking/{bookingId}` — danh sách vé (chỉ chủ booking).
  - `GET /api/tickets/{ticketId}/qr` — ảnh PNG QR (chỉ chủ booking).
  - `POST /api/tickets/check-in` — body `{ "qrToken": "<token>" }` (Admin/Staff).
- Kiểm tra nhanh dữ liệu ticket trong DB (không tạo dữ liệu giả):
```sql
SELECT TicketId, BookingDetailId, TicketCode, Status, IssuedAt, CheckedInAt, CheckedInByUserId
FROM Tickets ORDER BY TicketId DESC;

SELECT TOP 50 * FROM TicketCheckInLogs ORDER BY LogId DESC;
```

---

## 1. Giai đoạn 1 — Phát hành vé tự động

| # | Kịch bản | Cách thực hiện | Kết quả mong đợi |
|---|----------|----------------|------------------|
| 1.1 | Booking Paid + Payment Success + 1 ghế | Thanh toán thành công booking 1 ghế | Sinh đúng **1** Ticket, `Status = Issued`, có `TicketCode`, `QRToken`, `IssuedAt` |
| 1.2 | Booking Paid + Payment Success + nhiều ghế | Thanh toán booking N ghế | Sinh đúng **N** Ticket, mỗi `BookingDetailId` 1 vé; `TicketCode` khác nhau từng ghế |
| 1.3 | Booking Pending | Tạo booking, không thanh toán | **Không** sinh Ticket |
| 1.4 | Payment Failed | Đẩy payment sang `Failed` | **Không** sinh Ticket |
| 1.5 | Payment PaidNeedRefund | Đẩy payment sang `PaidNeedRefund` | **Không** sinh Ticket |
| 1.6 | Booking Paid nhưng không có BookingDetail | Booking `Paid` + 0 detail (dữ liệu bất thường) | **Không** sinh Ticket, không lỗi |
| 1.7 | Callback thanh toán gửi nhiều lần | Gọi lại `ConfirmPaymentResultAsync` / bank transfer cùng booking | Không tạo vé trùng (idempotent), số Ticket không tăng |
| 1.8 | Ticket đã tồn tại trước đó | Chạy lại luồng thanh toán cho booking đã có vé | Bỏ qua detail đã có vé, không nhân bản |

Kiểm tra thêm:
- `TicketCode` **không** trùng với `Bookings.TicketCode`.
- `QRToken` là chuỗi hex ngẫu nhiên (64 ký tự), **không** chứa BookingId/UserId/PII.
- Vé nằm trong transaction của luồng thanh toán (không có vé "mồ côi" khi payment lỗi).

---

## 2. Giai đoạn 2 — Backend API lấy vé

| # | Kịch bản | Cách thực hiện | Kết quả mong đợi |
|---|----------|----------------|------------------|
| 2.1 | Chủ booking xem vé | Đăng nhập customer sở hữu → `GET /api/tickets/booking/{id}` | 200, trả `tickets[]` có `ticketId`, `ticketCode`, `qrImageUrl`, `status`, `issuedAt`, phim/rạp/phòng/ngày/giờ/ghế |
| 2.2 | Người khác xem vé | Đăng nhập user B → gọi API của booking của user A | 404/không trả dữ liệu (không lộ vé người khác) |
| 2.3 | Không đăng nhập | Gọi API không có session | 401 |
| 2.4 | Tải ảnh QR | `GET /api/tickets/{ticketId}/qr` với chủ booking | 200 `image/png`; **không** trả `QRToken` thô |
| 2.5 | Tải QR người khác | Chủ khác gọi `.../{ticketId}/qr` | 404 |
| 2.6 | Booking chưa có vé | Booking Pending | `tickets[]` trả `status = NotIssued`, `qrImageUrl = null` |

---

## 3. Giai đoạn 3 — Backend API check-in

| # | Kịch bản | Chuẩn bị | Kết quả mong đợi |
|---|----------|----------|------------------|
| 3.1 | QR hợp lệ | Vé `Issued`, booking `Paid` + payment `Success` | 200 `success=true`; Ticket → `Used`; ghi `CheckedInAt`, `CheckedInByUserId`; log `CheckedIn` |
| 3.2 | QR không tồn tại | Gửi token bất kỳ | 400, "Vé không tồn tại." |
| 3.3 | QR đã được sử dụng | Quét lại vé 3.1 | 400, "Vé đã được sử dụng." (không đổi trạng thái) |
| 3.4 | QR đã bị hủy | Set `Tickets.Status='Cancelled'` rồi quét | 400, "Vé đã bị hủy." |
| 3.5 | Thanh toán chưa thành công | Booking không `Paid` hoặc không có payment `Success` | 400, "Thanh toán chưa thành công." |
| 3.6 | Người dùng không có quyền check-in | Customer gọi `POST /api/tickets/check-in` | 403 "Bạn không có quyền check-in vé." |
| 3.7 | Hai nhân viên quét cùng vé đồng thời | Bắn 2 request song song cùng `qrToken` | **Chỉ 1** request `success=true`; request còn lại nhận "Vé đã được sử dụng." |
| 3.8 | Suất chiếu không hợp lệ | `Showtimes.Status != 'Active'` | 400, "Suất chiếu không còn hợp lệ." |
| 3.9 | StaffId lấy từ session | Đăng nhập Staff/Admin quét vé | `CheckedInByUserId` = user đăng nhập (không nhận từ request) |

Kiểm tra log: mọi lần từ chối đều ghi `TicketCheckInLogs` với `Action = Rejected` và `Message` tương ứng; thành công ghi `Action = CheckedIn`.

---

## 4. Giai đoạn 4 — Frontend hiển thị vé QR

| # | Kịch bản | Cách thực hiện | Kết quả mong đợi |
|---|----------|----------------|------------------|
| 4.1 | Thanh toán thành công hiển thị vé | Đặt vé → thanh toán `Success` | Trang thanh toán hiển thị vé; **mỗi ghế có 1 khối QR riêng** + mã vé + trạng thái "Chưa sử dụng" |
| 4.2 | Tải lại trang vẫn xem được vé | Đăng nhập → vào "Đặt vé" → xem chi tiết booking | Modal vé hiển thị đúng QR từng ghế, thông tin phim/rạp/phòng/ngày giờ/ghế |
| 4.3 | QR đúng nguồn | Kiểm tra request ảnh | QR tải từ `/api/tickets/{ticketId}/qr` (sinh từ QRToken), **không** dùng BookingId/TicketCode làm nội dung QR |
| 4.4 | Trạng thái vé | Quét check-in vé rồi mở lại | Badge chuyển "Đã sử dụng"; vé chưa quét: "Chưa sử dụng"; vé hủy: "Đã hủy" |
| 4.5 | Booking chưa thanh toán | Mở booking Pending | Không hiển thị QR vé; dùng fallback QR booking (nếu hệ thống cho xem) |
| 4.6 | Loading / Empty / Error | Ngắt mạng / chậm API | Có trạng thái loading; khi không có vé hiển thị thông báo phù hợp; lỗi tải QR có ảnh thay thế |

---

## 5. Giai đoạn 5 — Frontend quét QR check-in (`/admin/check-in`)

| # | Kịch bản | Cách thực hiện | Kết quả mong đợi |
|---|----------|----------------|------------------|
| 5.1 | Bật camera | Nhấn "Bật camera" | Video hiển thị, có khung ngắm; nút đổi thành "Tắt camera" |
| 5.2 | Tắt camera | Nhấn "Tắt camera" | Dừng stream, hiển thị "Camera đang tắt" |
| 5.3 | Quét QR hợp lệ | Đưa QR vé `Issued` vào camera | Panel kết quả xanh: phim, suất chiếu, phòng, ghế, mã vé, thời điểm check-in |
| 5.4 | Quét vé đã dùng | Quét lại vé vừa check-in | Panel đỏ "Từ chối check-in" + "Vé đã được sử dụng." |
| 5.5 | Vé không tồn tại / đã hủy / chưa thanh toán | Quét token tương ứng | Panel đỏ kèm lý do cụ thể |
| 5.6 | Chống gửi lặp | Giữ QR trong khung ngắm liên tục | Chỉ gửi 1 lần cho mỗi mã (camera tự dừng sau khi nhận mã) |
| 5.7 | Quét lại | Sau khi có kết quả, nhấn "Quét lại" | Xóa kết quả, mở lại camera |
| 5.8 | Nhập thủ công | Mở "Nhập mã thủ công", dán QRToken, "Kiểm tra vé" | Gửi request như quét camera, hiển thị kết quả |
| 5.9 | Từ chối quyền camera | Chặn quyền camera ở trình duyệt → "Bật camera" | Thông báo hướng dẫn cấp quyền (NotAllowedError) |
| 5.10 | Không có camera | Máy không có camera | Thông báo "Không tìm thấy thiết bị camera" |
| 5.11 | Loading | Trong lúc gọi API | Nút quét lại bị vô hiệu; hiển thị spinner "Đang kiểm tra vé…" |
| 5.12 | Phân quyền UI | Đăng nhập Customer mở `/admin/check-in` | Hiển thị "Bạn không có quyền check-in vé" (backend vẫn chặn 403) |

---

## 6. Kiểm tra build

- `dotnet build` trong `MovieBooking` → **Build succeeded, 0 Warning, 0 Error** (đã xác nhận, bao gồm build React).
- `npm run build` trong `booking_ticket` → build thành công (đã xác nhận).

---

## 7. Ghi chú kỹ thuật

- Vé phát hành trong helper private `IssueTicketsForBookingAsync` tại `Services/PaymentService.cs`, chèn vào 4 luồng thanh toán: `VerifyAdminPaymentAsync`, `ProcessPaymentAsync`, `ConfirmPaymentResultAsync`, `ProcessBankTransferAsync` — trước khi commit transaction.
- `QRToken` sinh bằng `RandomNumberGenerator.GetBytes(32)` → 64 ký tự hex (cột `QRToken` maxlen 128).
- Chống race condition check-in: `ExecuteUpdateAsync` với điều kiện `WHERE TicketId = @id AND Status = 'Issued'`; `affected == 0` ⇒ đã bị người khác sử dụng, trong transaction `IsolationLevel.Serializable`.
- Phân quyền check-in: backend kiểm tra `Role ∈ {Admin, Staff}` từ session; `StaffId = Session["UserId"]`.
