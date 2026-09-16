-- =========================================================
-- DATABASE: Website Bán Vé Xem Phim
-- =========================================================

CREATE DATABASE MovieBookingDB;
GO

USE MovieBookingDB;
GO

-- =========================================================
-- 1. USERS
-- =========================================================
CREATE TABLE Users (
    UserId          INT IDENTITY(1,1) PRIMARY KEY,
    FullName        NVARCHAR(100) NOT NULL,
    Email           VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash    VARCHAR(255) NOT NULL,
    Phone           VARCHAR(15),
    Role            VARCHAR(20) NOT NULL DEFAULT 'Customer' CHECK (Role IN ('Customer','Admin')),
    Status          BIT NOT NULL DEFAULT 1,
    CreatedAt       DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- =========================================================
-- 2. GENRES & MOVIES
-- =========================================================
CREATE TABLE Genres (
    GenreId         INT IDENTITY(1,1) PRIMARY KEY,
    GenreName       NVARCHAR(50) NOT NULL UNIQUE
);
GO

CREATE TABLE Movies (
    MovieId         INT IDENTITY(1,1) PRIMARY KEY,
    Title           NVARCHAR(200) NOT NULL,
    Description     NVARCHAR(MAX),
    Duration        INT NOT NULL,                  -- phút
    ReleaseDate     DATE,
    EndDate         DATE,
    PosterUrl       VARCHAR(255),
    TrailerUrl      VARCHAR(255),
    Director        NVARCHAR(100),
    Actors          NVARCHAR(500),
    Language        NVARCHAR(50),
    AgeRating       VARCHAR(10) CHECK (AgeRating IN ('P','C13','C16','C18')),
    Status          VARCHAR(20) NOT NULL DEFAULT 'Coming Soon'
                    CHECK (Status IN ('Showing','Coming Soon','Ended')),
    CreatedAt       DATETIME NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE MovieGenres (
    MovieId         INT NOT NULL,
    GenreId         INT NOT NULL,
    PRIMARY KEY (MovieId, GenreId),
    FOREIGN KEY (MovieId) REFERENCES Movies(MovieId) ON DELETE CASCADE,
    FOREIGN KEY (GenreId) REFERENCES Genres(GenreId) ON DELETE CASCADE
);
GO

-- =========================================================
-- 3. CINEMAS, ROOMS, SEATS
-- =========================================================
CREATE TABLE Cinemas (
    CinemaId        INT IDENTITY(1,1) PRIMARY KEY,
    Name            NVARCHAR(150) NOT NULL,
    Address         NVARCHAR(255),
    City            NVARCHAR(100),
    Phone           VARCHAR(15)
);
GO

CREATE TABLE Rooms (
    RoomId          INT IDENTITY(1,1) PRIMARY KEY,
    CinemaId        INT NOT NULL,
    RoomName        NVARCHAR(50) NOT NULL,
    RoomType        VARCHAR(20) NOT NULL DEFAULT '2D' CHECK (RoomType IN ('2D','3D','IMAX')),
    TotalSeats      INT NOT NULL DEFAULT 0,
    FOREIGN KEY (CinemaId) REFERENCES Cinemas(CinemaId) ON DELETE CASCADE
);
GO

CREATE TABLE Seats (
    SeatId          INT IDENTITY(1,1) PRIMARY KEY,
    RoomId          INT NOT NULL,
    SeatRow         VARCHAR(2) NOT NULL,            -- A, B, C...
    SeatNumber      INT NOT NULL,
    SeatType        VARCHAR(20) NOT NULL DEFAULT 'Normal' CHECK (SeatType IN ('Normal','VIP','Couple')),
    IsActive        BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (RoomId) REFERENCES Rooms(RoomId) ON DELETE CASCADE,
    CONSTRAINT UQ_Seat_Room UNIQUE (RoomId, SeatRow, SeatNumber)
);
GO

-- =========================================================
-- 4. SHOWTIMES & SHOWTIME SEATS
-- =========================================================
CREATE TABLE Showtimes (
    ShowtimeId      INT IDENTITY(1,1) PRIMARY KEY,
    MovieId         INT NOT NULL,
    RoomId          INT NOT NULL,
    ShowDate        DATE NOT NULL,
    StartTime       TIME NOT NULL,
    EndTime         TIME NOT NULL,
    Price           DECIMAL(10,2) NOT NULL,
    Status          VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active','Cancelled','Finished')),
    FOREIGN KEY (MovieId) REFERENCES Movies(MovieId),
    FOREIGN KEY (RoomId) REFERENCES Rooms(RoomId)
);
GO

-- Trạng thái từng ghế theo từng suất chiếu (giải quyết bài toán chống trùng ghế)
CREATE TABLE ShowtimeSeats (
    ShowtimeSeatId  INT IDENTITY(1,1) PRIMARY KEY,
    ShowtimeId      INT NOT NULL,
    SeatId          INT NOT NULL,
    Status          VARCHAR(20) NOT NULL DEFAULT 'Available'
                    CHECK (Status IN ('Available','Holding','Booked')),
    HoldExpiresAt   DATETIME NULL,
    LockedByUserId  INT NULL,
    FOREIGN KEY (ShowtimeId) REFERENCES Showtimes(ShowtimeId) ON DELETE CASCADE,
    FOREIGN KEY (SeatId) REFERENCES Seats(SeatId),
    FOREIGN KEY (LockedByUserId) REFERENCES Users(UserId),
    CONSTRAINT UQ_ShowtimeSeat UNIQUE (ShowtimeId, SeatId)
);
GO

-- =========================================================
-- 5. PROMOTIONS
-- =========================================================
CREATE TABLE Promotions (
    PromotionId     INT IDENTITY(1,1) PRIMARY KEY,
    Code            VARCHAR(30) NOT NULL UNIQUE,
    Description     NVARCHAR(255),
    DiscountPercent DECIMAL(5,2) NOT NULL CHECK (DiscountPercent BETWEEN 0 AND 100),
    StartDate       DATE NOT NULL,
    EndDate         DATE NOT NULL,
    Status          BIT NOT NULL DEFAULT 1
);
GO

-- =========================================================
-- 6. BOOKINGS, BOOKING DETAILS, PAYMENTS
-- =========================================================
CREATE TABLE Bookings (
    BookingId       INT IDENTITY(1,1) PRIMARY KEY,
    UserId          INT NOT NULL,
    ShowtimeId      INT NOT NULL,
    PromotionId     INT NULL,
    BookingDate     DATETIME NOT NULL DEFAULT GETDATE(),
    TotalAmount     DECIMAL(10,2) NOT NULL,
    Status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
                    CHECK (Status IN ('Pending','Paid','Cancelled')),
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    FOREIGN KEY (ShowtimeId) REFERENCES Showtimes(ShowtimeId),
    FOREIGN KEY (PromotionId) REFERENCES Promotions(PromotionId)
);
GO

CREATE TABLE BookingDetails (
    BookingDetailId INT IDENTITY(1,1) PRIMARY KEY,
    BookingId       INT NOT NULL,
    ShowtimeSeatId  INT NOT NULL,
    Price           DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (BookingId) REFERENCES Bookings(BookingId) ON DELETE CASCADE,
    FOREIGN KEY (ShowtimeSeatId) REFERENCES ShowtimeSeats(ShowtimeSeatId),
    CONSTRAINT UQ_BookingDetail_Seat UNIQUE (ShowtimeSeatId)
);
GO

CREATE TABLE Payments (
    PaymentId       INT IDENTITY(1,1) PRIMARY KEY,
    BookingId       INT NOT NULL,
    Amount          DECIMAL(10,2) NOT NULL,
    Method          VARCHAR(20) NOT NULL CHECK (Method IN ('VNPay','Momo','COD')),
    TransactionCode VARCHAR(100),
    PaymentStatus   VARCHAR(20) NOT NULL DEFAULT 'Pending'
                    CHECK (PaymentStatus IN ('Pending','Success','Failed')),
    PaidAt          DATETIME NULL,
    FOREIGN KEY (BookingId) REFERENCES Bookings(BookingId) ON DELETE CASCADE
);
GO

-- =========================================================
-- 7. REVIEWS (tuỳ chọn, nâng cao đề tài)
-- =========================================================
CREATE TABLE Reviews (
    ReviewId        INT IDENTITY(1,1) PRIMARY KEY,
    UserId          INT NOT NULL,
    MovieId         INT NOT NULL,
    Rating          INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comment         NVARCHAR(500),
    CreatedAt       DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    FOREIGN KEY (MovieId) REFERENCES Movies(MovieId)
);
GO

-- =========================================================
-- INDEX gợi ý (tối ưu truy vấn hay dùng)
-- =========================================================
CREATE INDEX IX_Showtimes_MovieId_ShowDate ON Showtimes(MovieId, ShowDate);
CREATE INDEX IX_ShowtimeSeats_ShowtimeId ON ShowtimeSeats(ShowtimeId);
CREATE INDEX IX_Bookings_UserId ON Bookings(UserId);
GO