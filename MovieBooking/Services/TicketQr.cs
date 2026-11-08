using QRCoder;

namespace MovieBooking.Services;

public static class TicketQr
{
    public static byte[] Png(string code)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(code, QRCodeGenerator.ECCLevel.Q);
        return new PngByteQRCode(data).GetGraphic(10);
    }
}