import { useEffect, useState } from "react";
import { Star, Trash2, MessageSquare, Film, Filter, User } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function ManageReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState("");

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const query = ratingFilter ? `/api/admin/reviews?rating=${ratingFilter}` : "/api/admin/reviews";
      const data = await api.get(query);
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải danh sách đánh giá");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [ratingFilter]);

  const handleDelete = async (review) => {
    if (!window.confirm(`Bạn có chắc muốn xóa đánh giá của "${review.customerName}"?`)) return;
    try {
      await api.delete(`/api/admin/reviews/${review.id}`);
      toast.success("Đã xóa đánh giá.");
      fetchReviews();
    } catch (err) {
      toast.error(err.message || "Không thể xóa đánh giá.");
    }
  };

  return !loading ? (
    <div className="max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Title text1="Quản Lý" text2="Đánh Giá Phim" />
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-xl text-sm">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-transparent text-white outline-none cursor-pointer"
          >
            <option value="" className="bg-gray-900 text-white">Tất cả số sao</option>
            <option value="5" className="bg-gray-900 text-white">⭐⭐⭐⭐⭐ (5 sao)</option>
            <option value="4" className="bg-gray-900 text-white">⭐⭐⭐⭐ (4 sao)</option>
            <option value="3" className="bg-gray-900 text-white">⭐⭐⭐ (3 sao)</option>
            <option value="2" className="bg-gray-900 text-white">⭐⭐ (2 sao)</option>
            <option value="1" className="bg-gray-900 text-white">⭐ (1 sao)</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.length > 0 ? (
          reviews.map((r) => (
            <div
              key={r.id}
              className="bg-gray-900/80 rounded-2xl border border-primary/20 p-5 shadow-xl hover:border-primary/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {r.posterUrl ? (
                      <img
                        src={r.posterUrl}
                        alt={r.movieTitle}
                        className="w-12 h-16 object-cover rounded-lg shrink-0 border border-gray-700"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                        <Film className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-white text-base leading-tight">{r.movieTitle}</h4>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" /> {r.customerName}
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500">{r.customerEmail}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(r)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                    title="Xóa đánh giá này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3.5 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-700"
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-amber-400 ml-1.5 font-mono">{r.rating}.0</span>
                </div>

                <p className="mt-2.5 text-sm text-gray-300 italic bg-black/40 p-3 rounded-xl border border-gray-800">
                  "{r.comment || "Không có bình luận chữ"}"
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-800 text-right text-[11px] text-gray-500 font-mono">
                Đăng lúc: {r.createdAt}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 p-12 text-center text-gray-400 bg-gray-900/60 rounded-xl">
            Chưa có đánh giá nào phù hợp với bộ lọc.
          </div>
        )}
      </div>
    </div>
  ) : (
    <Loading />
  );
}
