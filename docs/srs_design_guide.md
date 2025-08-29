# Hướng dẫn Thiết kế Hệ thống Lặp lại Ngắt quãng (SRS)

## 1. Mục tiêu

Xây dựng một tính năng học tập thông minh, giúp người dùng ghi nhớ từ vựng hiệu
quả bằng cách hiển thị các thẻ học (flashcards) vào những thời điểm tối ưu, dựa
trên nguyên lý "đường cong lãng quên" (forgetting curve). Hệ thống phải tích hợp
liền mạch với các phiên học từ video trên FluentFlow, cho phép người dùng dễ
dàng thêm từ và theo dõi tiến độ của mình.

## 2. Các Trụ cột Chính cần Chú trọng

Để xây dựng một hệ thống SRS thành công, chúng ta cần tập trung vào sự cân bằng
của 3 trụ cột chính. Không thể chỉ chú trọng vào một yếu tố duy nhất.

1.  **Logic Lặp lại (Thuật toán):** Đây là trái tim của hệ thống. Một thuật toán
    tốt sẽ đảm bảo việc học thực sự hiệu quả. **Đây là yếu tố nền tảng quan
    trọng nhất.**
2.  **Trải nghiệm Người dùng (UI/UX):** Đây là yếu tố quyết định người dùng có
    muốn sử dụng tính năng hàng ngày hay không. Nó trả lời cho câu hỏi "làm sao
    cho đẹp mắt và dễ dùng".
3.  **Tích hợp và Nội dung:** Đảm bảo tính năng hoạt động trơn tru với luồng làm
    việc hiện tại của người dùng và nội dung học tập (từ vựng) được quản lý tốt.

---

## 3. Chi tiết Triển khai

### Phần 1: Logic Cốt lõi - Thuật toán Lặp lại

Nền tảng của SRS là một thuật toán quyết định khi nào người dùng nên ôn tập lại
một kiến thức. Thay vì ôn tập ngẫu nhiên, chúng ta sẽ tính toán thời điểm tối ưu
ngay trước khi họ chuẩn bị quên.

#### **Lựa chọn Công nghệ và Khả năng Tương thích**

Thay vì tự triển khai thuật toán từ đầu, **chúng tôi thực sự khuyên bạn nên sử
dụng một package có sẵn trên npm**. Điều này giúp tiết kiệm thời gian, giảm
thiểu lỗi và đảm bảo bạn đang sử dụng một triển khai đã được kiểm chứng.

- **Package Đề xuất:** **`@open-spaced-repetition/sm-2`**

  - **Lý do:** Package này chuyên dụng cho thuật toán SM-2, được viết bằng
    TypeScript, không có dependencies, và rất nhẹ. Nó hoàn hảo cho việc tích hợp
    vào dự án của chúng ta.
  - **Khả năng tương thích:** Hoàn toàn tương thích. Vì đây là một thư viện
    logic thuần túy, nó có thể chạy ở bất kỳ môi trường JavaScript/TypeScript
    nào:
    - **Client-side (Chrome Extension):** Có thể chạy trực tiếp trên trình duyệt
      để cung cấp phản hồi ngay lập tức.
    - **Backend (Supabase Edge Functions):** Cũng có thể chạy trên server Deno
      của Supabase nếu bạn muốn xử lý logic ở phía backend.

- **Ví dụ sử dụng `sm-2`:**

  ```typescript
  import { sm2 } from '@open-spaced-repetition/sm-2'

  // Giả sử người dùng đánh giá độ khó từ 0-5 (0=quên, 5=rất dễ)
  const userRating = 4

  const currentCard = {
    interval: 10, // Lần ôn tập trước cách đây 10 ngày
    repetitions: 3, // Đã trả lời đúng 3 lần liên tiếp
    easeFactor: 2.5 // Hệ số dễ/khó của thẻ
  }

  const updatedCard = sm2(currentCard, userRating)

  // updatedCard sẽ chứa các giá trị mới để bạn cập nhật vào DB
  // { interval: 25, repetitions: 4, easeFactor: 2.5, isCorrect: true }
  ```

- **Lựa chọn Nâng cao:** Nếu trong tương lai bạn muốn một thuật toán mạnh mẽ
  hơn, hãy xem xét **`ts-fsrs`**, một thư viện triển khai thuật toán FSRS mới
  của Anki.

#### **Mô hình Dữ liệu**

Để triển khai SM-2, mỗi từ vựng (`UserVocabularyItem`) cần lưu trữ các thông tin
sau:

- `interval` (number): Khoảng cách hiện tại giữa các lần ôn tập (tính bằng
  ngày).
- `repetitions` (number): Số lần người dùng đã ôn tập thành công (trả lời "Good"
  hoặc "Easy") liên tiếp.
- `easeFactor` (number): Một hệ số (E-Factor) đại diện cho độ "dễ" của từ vựng
  đối với người dùng. Giá trị khởi đầu thường là 2.5.
- `nextReviewDate` (Date): Ngày dự kiến cho lần ôn tập tiếp theo.

#### **Luồng Ôn tập**

1.  Hệ thống hiển thị các thẻ có `nextReviewDate` là hôm nay hoặc trong quá khứ.
2.  Người dùng cố gắng nhớ lại nghĩa của từ (active recall).
3.  Sau khi xem đáp án, người dùng tự đánh giá mức độ ghi nhớ của mình qua các
    nút bấm. Ví dụ:

    - **Again (Quên - rating 0-2):** Reset `repetitions` về 0, `interval` quay
      lại mức tối thiểu (ví dụ: 1 ngày).
    - **Hard (Khó - rating 3):** `interval` tăng một chút, `easeFactor` giảm
      nhẹ.
    - **Good (Tốt - rating 4):** `interval` được tính lại dựa trên `easeFactor`
      và `repetitions`. `repetitions` tăng lên 1.
    - **Easy (Dễ - rating 5):** `interval` tăng nhiều nhất, `easeFactor` tăng
      nhẹ. `repetitions` tăng lên 1.

4.  Dựa trên lựa chọn của người dùng, hệ thống cập nhật lại các trường dữ liệu
    trên và lên lịch cho `nextReviewDate` mới.

### Phần 2: Trải nghiệm Người dùng (UI/UX) - Làm cho Việc học trở nên Hấp dẫn

Một thuật toán tốt là vô nghĩa nếu giao diện nhàm chán và khó sử dụng. Đây là
phần trả lời cho câu hỏi "làm sao cho đẹp mắt".

#### **Giao diện Ôn tập**

- **Tối giản:** Thiết kế dạng flashcard, tập trung vào nội dung. Mặt trước chỉ
  hiển thị từ vựng. Mặt sau hiển thị đầy đủ thông tin (định nghĩa, ví dụ, phát
  âm).
- **Tập trung vào Active Recall:** Luôn hiển thị mặt trước của thẻ trước, buộc
  người dùng phải chủ động nhớ lại trước khi xem đáp án.

#### **Cơ chế Phản hồi**

- **Rõ ràng và Đơn giản:** Cung cấp 4 nút bấm ("Again", "Hard", "Good", "Easy")
  sau khi đáp án được hiển thị. Các nút cần có màu sắc và icon dễ phân biệt (ví
  dụ: Đỏ cho "Again", Xanh lá cho "Easy").

#### **Hiển thị Tiến độ và Tạo Động lực**

- **Dashboard Học tập:** Tạo một khu vực hiển thị các chỉ số quan trọng:
  - Số thẻ cần ôn tập hôm nay.
  - Biểu đồ lịch sử ôn tập (dạng heatmap như trên GitHub) để người dùng thấy sự
    liên tục.
  - Chuỗi ngày học (learning streak) để khuyến khích thói quen hàng ngày.
  - Thống kê tổng số từ đã học, mức độ thành thạo.

### Phần 3: Tích hợp và Quản lý Nội dung

#### **Thêm từ vào Hệ thống SRS**

- **Tích hợp Liền mạch:** Sau mỗi phiên học trên FluentFlow, hoặc khi người dùng
  "star" một từ, cần có một nút hoặc tùy chọn rõ ràng để "Add to Learning Deck"
  (Thêm vào bộ từ học).
- Khi một từ được thêm, nó sẽ được khởi tạo với các giá trị SRS mặc định
  (`interval: 1`, `repetitions: 0`, `easeFactor: 2.5`, `nextReviewDate`: ngày
  mai).

#### **Quản lý Nội dung (Atomic Knowledge)**

- **Nguyên tắc "Nguyên tử":** Mỗi flashcard chỉ nên chứa một đơn vị kiến thức.
  Đối với FluentFlow, điều này có nghĩa là mỗi thẻ là một từ hoặc một cụm từ
  ngắn. Tránh tạo các thẻ quá dài và phức tạp.
- **Quản lý Bộ từ:** Cung cấp một giao diện để người dùng có thể xem lại toàn bộ
  các từ trong bộ SRS của họ, tìm kiếm, và có thể tạm dừng (suspend) một từ nếu
  họ không muốn ôn tập nữa.

---

## 4. Kết luận

**Nên chú trọng vào điều gì?**

**Cả hai, nhưng theo thứ tự ưu tiên:**

1.  **Bắt đầu với Logic:** Xây dựng nền tảng thuật toán (SM-2) và mô hình dữ
    liệu một cách chính xác. Đây là xương sống của tính năng. Nếu logic sai,
    giao diện đẹp cũng vô ích.
2.  **Sau đó, làm cho nó "Đẹp mắt" và Dễ dùng:** Khi logic đã ổn định, hãy tập
    trung toàn lực vào UI/UX để tạo ra một trải nghiệm học tập hấp dẫn, mượt mà
    và có tính "gây nghiện" (theo hướng tích cực).

Một hệ thống SRS tốt là sự kết hợp hài hòa giữa khoa học (thuật toán) và nghệ
thuật (thiết kế trải nghiệm người dùng).
