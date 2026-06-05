# Object-Based Audio Editor

Object-Based Audio Editor là một ứng dụng web tĩnh dùng để tạo và chỉnh sửa scene âm thanh theo vị trí. Người dùng có thể thêm các audio object vào canvas, kéo thả vị trí, tùy chỉnh âm lượng, pitch, bass, treble, echo, phạm vi nghe và hình ảnh đại diện cho từng object.

## Tính năng chính

- Tạo scene 2D kích thước cố định `3000 x 2000px`.
- Thêm audio object với file âm thanh `.mp3` hoặc `.wav`.
- Gắn hình ảnh cho object bằng `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`.
- Kéo thả object và listener/spectator trực tiếp trên canvas.
- Mô phỏng âm thanh theo khoảng cách bằng Web Audio API.
- Điều chỉnh volume, pitch, bass, treble, echo, mute và hearing range.
- Điều chỉnh filter hình ảnh: brightness, saturation, hue, grayscale và blur.
- Thêm ảnh nền cho scene.
- Lưu và tải scene bằng file `.scene.json`, bao gồm dữ liệu audio/image được nhúng dạng data URL.

## Cấu trúc thư mục

```text
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── AudioEngine.js
│   ├── AudioObject.js
│   ├── Input.js
│   ├── Renderer.js
│   ├── Scene.js
│   ├── Spectator.js
│   ├── UI.js
│   └── Utils.js
└── scenes/
    └── test.scene.json
```

## Cách chạy project

Project không cần `npm install` vì chỉ dùng HTML, CSS và JavaScript thuần.

Cách khuyến nghị là chạy bằng static server ở thư mục gốc:

```bash
python -m http.server 8000
```

Sau đó mở trình duyệt tại:

```text
http://localhost:8000
```

Bạn cũng có thể mở trực tiếp `index.html`, nhưng tính năng chọn thư mục để lưu/tải scene hoạt động ổn định nhất trên Chrome hoặc Edge thông qua localhost.

## Hướng dẫn sử dụng nhanh

1. Bấm `Add Object` để thêm object mới.
2. Chọn file audio và file ảnh nếu cần.
3. Kéo object trên canvas để thay đổi vị trí nguồn âm.
4. Chọn object để chỉnh audio/image ở panel bên trái.
5. Chọn spectator để chỉnh ảnh đại diện và hearing range của người nghe.
6. Dùng `Save Scene` để lưu scene thành file `.scene.json`.
7. Dùng `Load Scene` để chọn lại scene đã lưu trong thư mục scene.

## Điều khiển canvas

- Click object: chọn object.
- Kéo object: thay đổi vị trí nguồn âm.
- Click spectator: chọn người nghe và đưa camera về vị trí spectator.
- Kéo spectator: thay đổi vị trí người nghe.
- Kéo vùng trống: pan camera.
- Lăn chuột: zoom vào/ra theo vị trí con trỏ.
- `W`, `A`, `S`, `D`: di chuyển spectator khi spectator đang được chọn.
- `Esc`: bỏ chọn object và chọn lại spectator.

## Lưu ý

- Browser hiện đại yêu cầu người dùng tương tác trước khi phát âm thanh, nên audio context sẽ được resume sau click đầu tiên.
- File `.scene.json` có thể rất lớn vì audio và image được lưu trực tiếp dưới dạng data URL.
- Tính năng lưu/tải scene theo thư mục dùng File System Access API, phù hợp nhất với Chrome hoặc Edge.
