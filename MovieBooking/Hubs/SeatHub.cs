
using Microsoft.AspNetCore.SignalR;

namespace MovieBooking.Hubs;

public class SeatHub : Hub
{
    public async Task SendTestMessage(string mess)
    {
        await Clients.All.SendAsync("ReceiveTestMessage", mess);
    }
}
