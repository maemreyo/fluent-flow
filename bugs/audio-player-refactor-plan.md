# Kế hoạch Refactor Audio Player

## 1. Vấn đề hiện tại

Component `AudioPlayer` hiện tại (`components/audio-player.tsx`) đang gặp phải một số lỗi và khó khăn trong việc bảo trì, phát triển tính năng mới. Việc tự xây dựng một trình phát audio từ đầu đòi hỏi nhiều công sức để xử lý các trường hợp biên, tương thích trình duyệt và đảm bảo hiệu suất.

## 2. Giải pháp đề xuất

Đề xuất thay thế component `AudioPlayer` hiện tại bằng thư viện `react-h5-audio-player` từ npm.

## 3. Lý do lựa chọn `react-h5-audio-player`

*   **Chuyên biệt và nhẹ:** Thư viện này được thiết kế đặc biệt cho HTML5 Audio, giúp nó nhẹ hơn và tập trung vào các tính năng cần thiết cho việc phát audio.
*   **Dễ sử dụng và tích hợp:** Cung cấp một API đơn giản, dễ dàng cài đặt và tích hợp vào dự án React.
*   **Giao diện mặc định tốt:** Có sẵn một giao diện người dùng cơ bản nhưng đẹp mắt, giúp tiết kiệm thời gian thiết kế.
*   **Khả năng tùy chỉnh CSS linh hoạt:** Cho phép tùy chỉnh sâu giao diện để phù hợp với thiết kế của dự án, đặc biệt là khi sử dụng Tailwind CSS và `shadcn`.

## 4. Khả năng tương thích định dạng Audio

`react-h5-audio-player` hoàn toàn tương thích với cách xử lý audio hiện tại của dự án:

*   **Định dạng:** Thư viện này hỗ trợ các định dạng audio chuẩn của HTML5, bao gồm `audio/webm` mà bạn đang sử dụng.
*   **Nguồn dữ liệu:** Bạn đang chuyển đổi dữ liệu base64 thành `Blob` và sau đó tạo `Object URL` (`URL.createObjectURL`). `react-h5-audio-player` có thể nhận trực tiếp `Object URL` này thông qua thuộc tính `src` của nó, giống như thẻ `<audio>` HTML gốc.

**Ví dụ về cách sử dụng `src`:**

```typescript
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css'; // Import CSS mặc định

// ... trong component của bạn
const audioBlob = base64ToBlob(recording.audioDataBase64, 'audio/webm');
const audioURL = URL.createObjectURL(audioBlob);

return (
  <AudioPlayer
    src={audioURL}
    autoPlay={false} // Tùy chọn
    onPlay={() => console.log('onPlay')}
    // ... các props khác
  />
);
```

## 5. Hướng dẫn tùy chỉnh CSS với Tailwind CSS

`react-h5-audio-player` cung cấp khả năng tùy chỉnh CSS mạnh mẽ, đặc biệt phù hợp với Tailwind CSS thông qua việc ghi đè các class name nội bộ:

1.  **Import CSS mặc định:** Đảm bảo bạn đã import file CSS mặc định của thư viện vào file CSS gốc của ứng dụng (ví dụ: `src/index.css` hoặc `src/main.jsx`):
    ```typescript
    import 'react-h5-audio-player/lib/styles.css';
    ```

2.  **Xác định các Class Name nội bộ:**
    *   Sử dụng công cụ phát triển của trình duyệt (Developer Tools) để kiểm tra component `AudioPlayer` đã render.
    *   Tìm các class name bắt đầu bằng `rhap_` (ví dụ: `rhap_container`, `rhap_play-pause-button`, `rhap_progress-filled`, `rhap_volume-indicator`). Đây là các class mà bạn sẽ nhắm mục tiêu để tùy chỉnh.

3.  **Tùy chỉnh bằng `@apply` trong Global CSS:**
    *   Trong file CSS toàn cục của bạn (ví dụ: `src/index.css`), sử dụng directive `@apply` của Tailwind để áp dụng các utility class vào các class name nội bộ của player.
    *   Điều này giúp bạn duy trì sự nhất quán trong thiết kế và tận dụng toàn bộ sức mạnh của Tailwind.

    **Ví dụ:**

    ```css
    /* src/index.css */

    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    /* Tùy chỉnh cho container chính của player */
    .rhap_container {
      @apply bg-gray-800 text-white p-4 rounded-lg shadow-lg;
      border: 1px solid theme('colors.blue.500'); /* Ví dụ thêm border */
    }

    /* Tùy chỉnh nút Play/Pause */
    .rhap_play-pause-button {
      @apply text-blue-400 hover:text-blue-600 transition-colors duration-200;
    }

    /* Tùy chỉnh các nút điều khiển khác (skip, volume) */
    .rhap_controls-section button {
      @apply text-gray-300 hover:text-blue-400 transition-colors duration-200;
    }

    /* Tùy chỉnh thanh tiến trình (phần đã phát) */
    .rhap_progress-filled {
      @apply bg-blue-500;
    }

    /* Tùy chỉnh thanh tiến trình (phần chưa phát) */
    .rhap_progress-indicator {
      @apply bg-blue-300;
    }

    /* Tùy chỉnh thanh âm lượng */
    .rhap_volume-indicator {
      @apply bg-blue-300;
    }

    /* Tùy chỉnh hiển thị thời gian */
    .rhap_time {
      @apply text-sm text-gray-400;
    }

    /* Lưu ý: Có thể cần dùng !important nếu style không được áp dụng do độ ưu tiên */
    /* Ví dụ: .rhap_play-pause-button svg { @apply fill-current text-red-500 !important; } */
    ```

## 6. Các bước triển khai

1.  **Cài đặt thư viện:**
    ```bash
    npm install react-h5-audio-player
    # hoặc
    yarn add react-h5-audio-player
    ```
2.  **Thay thế component:**
    *   Trong `components/audio-player.tsx`, thay thế logic hiện tại bằng cách sử dụng component `AudioPlayer` từ `react-h5-audio-player`.
    *   Đảm bảo truyền đúng `src` (là `Object URL` đã tạo) và các props cần thiết khác như `autoPlay`, `onPlay`, `onPause`, `onEnded`, v.v.
3.  **Kiểm tra và tùy chỉnh CSS:**
    *   Chạy ứng dụng và kiểm tra giao diện của trình phát audio mới.
    *   Sử dụng Developer Tools để xác định các class name cần tùy chỉnh và áp dụng các style Tailwind trong file CSS toàn cục của bạn.
    *   Đảm bảo các chức năng (play, pause, seek, volume) hoạt động đúng.
