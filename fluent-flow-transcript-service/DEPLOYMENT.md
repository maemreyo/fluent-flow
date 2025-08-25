# Hướng dẫn Triển khai Dịch vụ Transcript lên Vercel

Đây là hướng dẫn từng bước để triển khai `fluent-flow-transcript-service` lên nền tảng Vercel. Vì đây là một dự án Next.js, Vercel sẽ tự động nhận diện và cấu hình gần như toàn bộ các thiết lập cần thiết.

## Điều kiện tiên quyết

1.  **Tài khoản Vercel:** Bạn cần có một tài khoản Vercel. Bạn có thể đăng ký miễn phí bằng tài khoản GitHub, GitLab, hoặc Bitbucket.
2.  **Mã nguồn trên Git:** Toàn bộ dự án `fluent-flow` (bao gồm cả thư mục con này) cần được đẩy lên một kho chứa Git (ví dụ: GitHub).

## Các bước Triển khai

### Bước 1: Import Dự án vào Vercel

1.  Truy cập vào [Bảng điều khiển Vercel](https://vercel.com/dashboard).
2.  Nhấp vào nút **"Add New..."** và chọn **"Project"**.
3.  Kết nối với nhà cung cấp Git của bạn (ví dụ: GitHub) và chọn kho chứa `fluent-flow`.

### Bước 2: Cấu hình Dự án

Đây là bước quan trọng nhất vì mã nguồn của bạn nằm trong một thư mục con.

1.  **Framework Preset:** Vercel sẽ tự động phát hiện đây là một dự án **Next.js**. Bạn không cần thay đổi gì ở đây.

2.  **Root Directory (Thư mục gốc):**
    *   Vercel sẽ mặc định sử dụng thư mục gốc của kho chứa. Bạn cần phải thay đổi nó.
    *   Nhấp vào **"Edit"** bên cạnh mục "Root Directory".
    *   Trong danh sách thả xuống, chọn **`fluent-flow-transcript-service`**.
    *   Sau khi chọn, Vercel sẽ tự động hiểu rằng mọi lệnh build và cài đặt sẽ được thực thi từ bên trong thư mục này.

3.  **Build and Output Settings:** Các thiết lập này thường sẽ được Vercel tự động điền đúng cho dự án Next.js. Bạn có thể để mặc định.

### Bước 3: Cấu hình Biến môi trường (Environment Variables)

1.  Mở mục **"Environment Variables"**.
2.  Thêm tất cả các biến môi trường mà dịch vụ của bạn cần để hoạt động. Hãy kiểm tra file `.env` hoặc `.env.local` của bạn để xem danh sách các biến cần thiết (ví dụ: `API_KEY`, `DATABASE_URL`, v.v.).
3.  Đối với mỗi biến, hãy nhập tên (Name) và giá trị (Value) của nó.

    *Lưu ý: Các biến môi trường trên Vercel được mã hóa và bảo mật.*

### Bước 4: Triển khai

1.  Sau khi đã hoàn tất các cấu hình trên, nhấp vào nút **"Deploy"**.
2.  Vercel sẽ bắt đầu quá trình build và triển khai ứng dụng của bạn. Bạn có thể theo dõi tiến trình trực tiếp.
3.  Khi hoàn tất, Vercel sẽ cung cấp cho bạn một URL mặc định (ví dụ: `your-service.vercel.app`) để bạn truy cập vào dịch vụ.

## Quá trình CI/CD (Tự động triển khai)

Sau khi thiết lập thành công, Vercel sẽ tự động triển khai lại dự án của bạn mỗi khi có một `push` mới lên nhánh chính (thường là `main` hoặc `master`). Điều này giúp bạn luôn có phiên bản mới nhất của dịch vụ được cập nhật tự động.

## Tên miền tùy chỉnh (Custom Domain) - Tùy chọn

Nếu bạn có tên miền riêng, bạn có thể dễ dàng trỏ nó đến dịch vụ này bằng cách vào tab **"Domains"** trong phần cài đặt dự án trên Vercel và làm theo hướng dẫn.
