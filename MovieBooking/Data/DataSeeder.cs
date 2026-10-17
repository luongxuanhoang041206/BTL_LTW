using System;
using System.Collections.Generic;
using System.Linq;
using Bogus;
using MovieBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace MovieBooking.Data;

public static class DataSeeder
{
    public static void Seed(MovieBookingContext context)
    {
        // Kiểm tra nếu chưa có FoodItems thì seed F&B và Combos
        if (!context.FoodItems.Any())
        {
            SeedFoodAndCombos(context);
        }

        // (removed duplicate quick-initialization) The main seeding below will create Cinemas/Rooms/Seats/Showtimes

        // Kiểm tra nếu đã có dữ liệu phim/user thì không seed lại phần core
        if (context.Users.Any() || context.Movies.Any())
        {
            return;
        }

        // 1. Seed Genres
        var genres = new List<Genre>
        {
            new Genre { GenreName = "Hành động" },
            new Genre { GenreName = "Hài hước" },
            new Genre { GenreName = "Kinh dị" },
            new Genre { GenreName = "Khoa học viễn tưởng" },
            new Genre { GenreName = "Lãng mạn" },
            new Genre { GenreName = "Hoạt hình" },
            new Genre { GenreName = "Tâm lý" },
            new Genre { GenreName = "Phiêu lưu" }
        };
        context.Genres.AddRange(genres);
        context.SaveChanges();

        // 6. Optionally seed a demo pending booking (only when necessary). We'll create a Pending booking
        // that holds a seat but does NOT create a payment record to avoid faking transactions.
        if (!context.Bookings.Any())
        {
            var customer = context.Users.FirstOrDefault(u => u.Role == "Customer");
            var showtime = context.Showtimes.Include(s => s.Room).FirstOrDefault(s => s.Status == "Active");

            if (customer != null && showtime != null)
            {
                var availableShowtimeSeat = context.ShowtimeSeats
                    .Where(ss => ss.ShowtimeId == showtime.ShowtimeId && ss.Status == "Available")
                    .FirstOrDefault();

                if (availableShowtimeSeat != null)
                {
                    var booking = new Booking
                    {
                        UserId = customer.UserId,
                        ShowtimeId = showtime.ShowtimeId,
                        BookingDate = DateTime.Now,
                        Status = "Pending",
                        TotalAmount = showtime.Price,
                    };
                    context.Bookings.Add(booking);
                    context.SaveChanges();

                    // create BookingDetail
                    var bookingDetail = new BookingDetail
                    {
                        BookingId = booking.BookingId,
                        ShowtimeSeatId = availableShowtimeSeat.ShowtimeSeatId,
                        Price = showtime.Price
                    };
                    context.BookingDetails.Add(bookingDetail);

                    // mark seat as Holding (not Booked) and lock to the user for a short time
                    availableShowtimeSeat.Status = "Holding";
                    availableShowtimeSeat.LockedByUserId = customer.UserId;
                    availableShowtimeSeat.HoldExpiresAt = DateTime.Now.AddMinutes(30);
                    context.ShowtimeSeats.Update(availableShowtimeSeat);

                    context.SaveChanges();
                    // Do NOT create Payment here to avoid inserting fake paid transactions.
                }
            }
        }

        // 2. Seed Users
        var users = new List<User>
        {
            new User
            {
                FullName = "Quản Trị Viên",
                Email = "admin@moviebooking.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                Phone = "0901234567",
                Role = "Admin",
                Status = true,
                CreatedAt = DateTime.Now
            },
            new User
            {
                FullName = "Nguyễn Văn A",
                Email = "user@moviebooking.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
                Phone = "0987654321",
                Role = "Customer",
                Status = true,
                CreatedAt = DateTime.Now
            }
        };

        var faker = new Faker("vi");
        for (int i = 1; i <= 5; i++)
        {
            users.Add(new User
            {
                FullName = faker.Name.FullName(),
                Email = faker.Internet.Email(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
                Phone = "09" + faker.Random.ReplaceNumbers("########"),
                Role = "Customer",
                Status = true,
                CreatedAt = DateTime.Now.AddDays(-i)
            });
        }
        context.Users.AddRange(users);
        context.SaveChanges();

        // 3. Seed Cinemas, Rooms, Seats
        var cinemas = new List<Cinema>
        {
            new Cinema
            {
                Name = "CGV Vincom Center",
                Address = "191 Bà Triệu, Hai Bà Trưng",
                City = "Hà Nội",
                Phone = "02439741234"
            },
            new Cinema
            {
                Name = "CGV Landmark 81",
                Address = "772 Điện Biên Phủ, Phường 22, Bình Thạnh",
                City = "Hồ Chí Minh",
                Phone = "02838231234"
            },
            new Cinema
            {
                Name = "Lotte Cinema Cầu Giấy",
                Address = "Tầng 3 TTTM Discovery Complex, 302 Cầu Giấy",
                City = "Hà Nội",
                Phone = "02438331234"
            }
        };
        context.Cinemas.AddRange(cinemas);
        context.SaveChanges();

        var roomTypes = new[] { "2D", "3D", "IMAX" };
        var allSeats = new List<Seat>();

        foreach (var cinema in cinemas)
        {
            for (int r = 1; r <= 2; r++)
            {
                var room = new Room
                {
                    CinemaId = cinema.CinemaId,
                    RoomName = $"Phòng {r}",
                    RoomType = roomTypes[(r - 1) % roomTypes.Length],
                    TotalSeats = 40 // 4 hàng x 10 ghế
                };
                context.Rooms.Add(room);
                context.SaveChanges();

                var rows = new[] { "A", "B", "C", "D" };
                foreach (var row in rows)
                {
                    for (int num = 1; num <= 10; num++)
                    {
                        string seatType = (row == "A" || row == "B") ? "Normal"
                                        : (row == "C") ? "VIP"
                                        : "Couple";

                        allSeats.Add(new Seat
                        {
                            RoomId = room.RoomId,
                            SeatRow = row,
                            SeatNumber = num,
                            SeatType = seatType,
                            IsActive = true
                        });
                    }
                }
            }
        }
        context.Seats.AddRange(allSeats);
        context.SaveChanges();

        // 4. Seed Movies
        var movies = new List<Movie>
        {
            new Movie
            {
                Title = "Mai",
                Description = "Câu chuyện về cuộc đời của người phụ nữ tên Mai, với nhiều nỗi đau và khao khát hạnh phúc đích thực.",
                Duration = 131,
                ReleaseDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-15)),
                EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(30)),
                PosterUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500",
                TrailerUrl = "https://www.youtube.com",
                Director = "Trấn Thành",
                Actors = "Phương Anh Đào, Tuấn Trần, Trấn Thành, Hồng Đào",
                Language = "Tiếng Việt",
                AgeRating = "C18",
                Status = "Showing",
                CreatedAt = DateTime.Now
            },
            new Movie
            {
                Title = "Dune: Hành Tinh Cát - Phần 2",
                Description = "Paul Atreides hội tụ cùng Chani và tộc người Fremen để tìm kiếm sự báo thù cho gia tộc của mình.",
                Duration = 166,
                ReleaseDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-10)),
                EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(35)),
                PosterUrl = "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500",
                TrailerUrl = "https://www.youtube.com",
                Director = "Denis Villeneuve",
                Actors = "Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem",
                Language = "Tiếng Anh - Phụ đề tiếng Việt",
                AgeRating = "C16",
                Status = "Showing",
                CreatedAt = DateTime.Now
            },
            new Movie
            {
                Title = "Kung Fu Panda 4",
                Description = "Po trở lại trong hành trình trở thành Thủ Lĩnh Tinh Thần của Thung Lũng Bình Yên và đối đầu Tắc Kè Bông.",
                Duration = 94,
                ReleaseDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-5)),
                EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(40)),
                PosterUrl = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500",
                TrailerUrl = "https://www.youtube.com",
                Director = "Mike Mitchell",
                Actors = "Jack Black, Awkwafina, Viola Davis, Dustin Hoffman",
                Language = "Lồng tiếng Việt",
                AgeRating = "P",
                Status = "Showing",
                CreatedAt = DateTime.Now
            },
            new Movie
            {
                Title = "Godzilla x Kong: Đế Chế Mới",
                Description = "Hai quái thú khổng lồ buộc phải liên thủ chống lại mối hiểm họa mới đe dọa sự tồn vong của nhân loại.",
                Duration = 115,
                ReleaseDate = DateOnly.FromDateTime(DateTime.Today.AddDays(7)),
                EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(45)),
                PosterUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500",
                TrailerUrl = "https://www.youtube.com",
                Director = "Adam Wingard",
                Actors = "Rebecca Hall, Brian Tyree Henry, Dan Stevens",
                Language = "Tiếng Anh - Phụ đề tiếng Việt",
                AgeRating = "C13",
                Status = "Coming Soon",
                CreatedAt = DateTime.Now
            },
            new Movie
            {
                Title = "Lật Mặt 7: Một Điều Ước",
                Description = "Câu chuyện gia đình đầy cảm xúc về tình mẫu tử của bà Hai và những người con trưởng thành.",
                Duration = 138,
                ReleaseDate = DateOnly.FromDateTime(DateTime.Today.AddDays(14)),
                EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(60)),
                PosterUrl = "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500",
                TrailerUrl = "https://www.youtube.com",
                Director = "Lý Hải",
                Actors = "Thanh Hiền, Trương Minh Cường, Đinh Y Nhung, Quách Ngọc Tuyên",
                Language = "Tiếng Việt",
                AgeRating = "P",
                Status = "Coming Soon",
                CreatedAt = DateTime.Now
            }
        };

        // Gán thể loại cho phim
        movies[0].Genres.Add(genres[1]); // Hài hước
        movies[0].Genres.Add(genres[4]); // Lãng mạn
        movies[0].Genres.Add(genres[6]); // Tâm lý

        movies[1].Genres.Add(genres[0]); // Hành động
        movies[1].Genres.Add(genres[3]); // Khoa học viễn tưởng
        movies[1].Genres.Add(genres[7]); // Phiêu lưu

        movies[2].Genres.Add(genres[1]); // Hài hước
        movies[2].Genres.Add(genres[5]); // Hoạt hình
        movies[2].Genres.Add(genres[7]); // Phiêu lưu

        movies[3].Genres.Add(genres[0]); // Hành động
        movies[3].Genres.Add(genres[3]); // Khoa học viễn tưởng

        movies[4].Genres.Add(genres[6]); // Tâm lý

        context.Movies.AddRange(movies);
        context.SaveChanges();

        // 5. Seed Showtimes & ShowtimeSeats
        var showingMovies = movies.Where(m => m.Status == "Showing" || m.Status == "NowShowing").ToList();
        var allRooms = context.Rooms.ToList();
        var today = DateOnly.FromDateTime(DateTime.Today);

        var showtimes = new List<Showtime>();
        var startTimes = new[]
        {
            new TimeOnly(9, 0),
            new TimeOnly(13, 30),
            new TimeOnly(16, 45),
            new TimeOnly(19, 30),
            new TimeOnly(21, 45)
        };

        foreach (var movie in showingMovies)
        {
            for (int dayOffset = 0; dayOffset <= 2; dayOffset++)
            {
                var showDate = today.AddDays(dayOffset);
                for (int t = 0; t < 2; t++)
                {
                    var room = allRooms[(movie.MovieId + dayOffset + t) % allRooms.Count];
                    var startTime = startTimes[(movie.MovieId + t) % startTimes.Length];
                    var endTime = startTime.AddMinutes(movie.Duration + 15);

                    var showtime = new Showtime
                    {
                        MovieId = movie.MovieId,
                        RoomId = room.RoomId,
                        ShowDate = showDate,
                        StartTime = startTime,
                        EndTime = endTime,
                        Price = (room.RoomType == "IMAX") ? 120000m : (room.RoomType == "3D") ? 100000m : 80000m,
                        Status = "Active"
                    };
                    context.Showtimes.Add(showtime);
                    context.SaveChanges();

                    // Tự động sinh ShowtimeSeats cho toàn bộ ghế của phòng
                    var roomSeats = context.Seats.Where(s => s.RoomId == room.RoomId).ToList();
                    var showtimeSeats = roomSeats.Select(s => new ShowtimeSeat
                    {
                        ShowtimeId = showtime.ShowtimeId,
                        SeatId = s.SeatId,
                        Status = "Available",
                        HoldExpiresAt = null,
                        LockedByUserId = null
                    }).ToList();

                    context.ShowtimeSeats.AddRange(showtimeSeats);
                    context.SaveChanges();
                }
            }
        }

        // 6. Seed Promotions
        var promotions = new List<Promotion>
        {
            new Promotion
            {
                Code = "GIAM20",
                Description = "Giảm 20% cho thành viên mới",
                DiscountPercent = 20.00m,
                StartDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-10)),
                EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(60)),
                Status = true
            },
            new Promotion
            {
                Code = "SUMMER10",
                Description = "Khuyến mãi chào hè - Giảm 10%",
                DiscountPercent = 10.00m,
                StartDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-5)),
                EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(90)),
                Status = true
            }
        };
        context.Promotions.AddRange(promotions);
        context.SaveChanges();
    }

    private static void SeedFoodAndCombos(MovieBookingContext context)
    {
        var foods = new List<FoodItem>
        {
            new FoodItem
            {
                Name = "Bắp rang ngọt (Vừa)",
                Description = "Bắp rang vị ngọt truyền thống giòn tan thơm lừng",
                Category = "Bắp rang",
                Price = 45000,
                ImageUrl = "https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=500&q=80",
                IsActive = true
            },
            new FoodItem
            {
                Name = "Bắp rang phô mai (Lớn)",
                Description = "Bắp rang lắc bột phô mai béo ngậy thơm ngon",
                Category = "Bắp rang",
                Price = 65000,
                ImageUrl = "https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=500&q=80",
                IsActive = true
            },
            new FoodItem
            {
                Name = "Bắp rang caramel (Lớn)",
                Description = "Bắp rang phủ caramel đậm đà ngọt ngào",
                Category = "Bắp rang",
                Price = 65000,
                ImageUrl = "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=500&q=80",
                IsActive = true
            },
            new FoodItem
            {
                Name = "Coca-Cola (Lớn)",
                Description = "Nước ngọt Coca-Cola có ga mát lạnh 32oz",
                Category = "Nước ngọt",
                Price = 35000,
                ImageUrl = "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80",
                IsActive = true
            },
            new FoodItem
            {
                Name = "Sprite (Lớn)",
                Description = "Nước giải khát vị chanh thơm sảng khoái 32oz",
                Category = "Nước ngọt",
                Price = 35000,
                ImageUrl = "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=500&q=80",
                IsActive = true
            },
            new FoodItem
            {
                Name = "Nước khoáng Dasani (500ml)",
                Description = "Nước khoáng tinh khiết thanh mát",
                Category = "Nước ngọt",
                Price = 20000,
                ImageUrl = "https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=500&q=80",
                IsActive = true
            },
            new FoodItem
            {
                Name = "Xúc xích nướng phô mai",
                Description = "Xúc xích Đức nướng phô mai thơm nóng hổi",
                Category = "Đồ ăn vặt",
                Price = 40000,
                ImageUrl = "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=500&q=80",
                IsActive = true
            }
        };

        context.FoodItems.AddRange(foods);
        context.SaveChanges();

        // Seed Combos
        var combo1 = new Combo
        {
            Name = "Combo Solo (1 Bắp ngọt + 1 Coca)",
            Description = "Dành riêng cho 1 người: 1 bắp rang ngọt vừa và 1 ly Coca-Cola lớn",
            Price = 69000,
            ImageUrl = "https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?auto=format&fit=crop&w=500&q=80",
            IsActive = true
        };

        var combo2 = new Combo
        {
            Name = "Combo Couple (1 Bắp phô mai + 2 Nước ngọt)",
            Description = "Gói đôi tiết kiệm: 1 bắp rang phô mai lớn và 2 ly nước ngọt lớn tự chọn",
            Price = 119000,
            ImageUrl = "https://images.unsplash.com/photo-1572177812156-58036aae439c?auto=format&fit=crop&w=500&q=80",
            IsActive = true
        };

        var combo3 = new Combo
        {
            Name = "Combo Party (2 Bắp lớn + 3 Nước ngọt + 1 Xúc xích)",
            Description = "Trọn vẹn xem phim cùng nhóm bạn: 2 bắp lớn, 3 ly nước ngọt và 1 phần xúc xích",
            Price = 229000,
            ImageUrl = "https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=500&q=80",
            IsActive = true
        };

        context.Combos.AddRange(combo1, combo2, combo3);
        context.SaveChanges();

        // Seed Combo Details
        context.ComboDetails.AddRange(
            // Combo Solo
            new ComboDetail { ComboId = combo1.ComboId, FoodItemId = foods[0].FoodItemId, Quantity = 1 },
            new ComboDetail { ComboId = combo1.ComboId, FoodItemId = foods[3].FoodItemId, Quantity = 1 },

            // Combo Couple
            new ComboDetail { ComboId = combo2.ComboId, FoodItemId = foods[1].FoodItemId, Quantity = 1 },
            new ComboDetail { ComboId = combo2.ComboId, FoodItemId = foods[3].FoodItemId, Quantity = 2 },

            // Combo Party
            new ComboDetail { ComboId = combo3.ComboId, FoodItemId = foods[1].FoodItemId, Quantity = 1 },
            new ComboDetail { ComboId = combo3.ComboId, FoodItemId = foods[2].FoodItemId, Quantity = 1 },
            new ComboDetail { ComboId = combo3.ComboId, FoodItemId = foods[3].FoodItemId, Quantity = 2 },
            new ComboDetail { ComboId = combo3.ComboId, FoodItemId = foods[4].FoodItemId, Quantity = 1 },
            new ComboDetail { ComboId = combo3.ComboId, FoodItemId = foods[6].FoodItemId, Quantity = 1 }
        );
        context.SaveChanges();
    }
}
