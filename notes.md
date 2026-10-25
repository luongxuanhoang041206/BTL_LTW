Luồng sau khi tích hợp RealTime 

Client A chọn và giữ ghế -> .net core booking service -> signalr thông báo thay đổi -> Client B tự cập nhật sơ đồ ghế 

Giai đoạn 1 : Giữ ghế để chọn combo 
    Khách chọn ghế -> FE gọi api hold -> BE kiếm tra và giữ ghế tạm hời -> signalr cập nhật cho mọi người 

Giai đoạn 2 : Xác nhận giữ ghế và thanh toán 
    Khi người dùng bấm tiếp tục, BE kiếm tra quyền giữ ghế và thời hạn hold. Nếu hợp lệ thì gia hạn or tạo lượt giữ ghế giai đoạn 2 ròi trả về thông tin tóm tắt đơn hàng 