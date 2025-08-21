# FluentFlow Sidebar Demo & Testing Guide

## 🎯 **Cách test FluentFlow Sidebar**

### 1. **Setup Extension**

```bash
# Build extension
pnpm build

# Load extension in Chrome:
# 1. Mở Chrome Dev Mode
# 2. Load unpacked extension từ thư mục build/chrome-mv3-dev
```

### 2. **Test trên YouTube**

```bash
# Mở YouTube video bất kỳ
https://www.youtube.com/watch?v=dQw4w9WgXcQ

# Sidebar sẽ tự động khởi tạo sau vài giây
```

## 🎮 **Các tính năng để test**

### ✨ **Sidebar Toggle**

- **Click FluentFlow icon** trên YouTube controls (bên phải volume)
- **Keyboard shortcut**: `Alt+F` để toggle sidebar
- **Animation**: Sidebar slide in/out mượt mà từ bên phải

### 🎛️ **Sidebar Features**

#### **Loop Controls Group**

- ✅ **Set Loop Start** - `Alt+1`
- ✅ **Toggle Loop Playback** - `Alt+L`
- ✅ **Set Loop End** - `Alt+2`
- ✅ **Export Current Loop** - `Alt+E` (right-click cho options)

#### **Recording & Audio Group**

- ✅ **Voice Recording** - `Alt+R`
- ✅ **Audio Compare** - `Alt+C`

#### **Notes & Learning Group**

- ✅ **Add Note** - `Alt+N` (right-click để xem notes)

#### **Tools & Settings Group**

- ✅ **Chrome Extension Panel** - `Alt+F`

### 🖱️ **Interactive Elements**

#### **Sidebar Controls**

- **Toggle icon** ở bên phải YouTube player
- **Close button** (X) trong header
- **Click outside** để đóng sidebar
- **Escape key** để đóng sidebar

#### **Button States**

- **Hover effects**: Buttons highlight khi hover
- **Active states**: Buttons thay đổi màu khi active (xanh lá)
- **Setting states**: Buttons màu vàng khi đang setting
- **Paused states**: Buttons màu đỏ khi paused

## 🧪 **Test Cases**

### **Test 1: Sidebar Initialization**

```javascript
// Mở Console và check logs
console.log('FluentFlow: Sidebar initialized successfully')
// Sidebar icon xuất hiện ở YouTube controls
```

### **Test 2: Toggle Functionality**

```javascript
// Test keyboard shortcuts
Alt+F -> Sidebar open/close
Alt+L -> Loop toggle (và button state change)
Alt+R -> Recording start/stop (và button state change)
```

### **Test 3: Responsive Design**

```javascript
// Resize browser window
// Sidebar tự động điều chỉnh cho mobile/desktop
// Check responsive breakpoints: 768px
```

### **Test 4: YouTube Navigation**

```javascript
// Navigate giữa các YouTube videos
// Sidebar persist và hoạt động bình thường
// Buttons reset state cho video mới
```

### **Test 5: Error Handling**

```javascript
// Check console cho fallback messages:
console.log('FluentFlow: Using legacy button container as fallback')
// Nếu sidebar fail, legacy buttons vẫn hoạt động
```

## 🎨 **Visual Inspection**

### **Design Consistency**

- ✅ Dark theme với `#1a1a1a` background
- ✅ Rounded corners `12px` border-radius
- ✅ Smooth transitions `0.3s cubic-bezier(0.4, 0, 0.2, 1)`
- ✅ Box shadow `0 8px 32px rgba(0, 0, 0, 0.3)`
- ✅ Backdrop filter blur effect

### **Typography**

- ✅ Font family: 'Roboto', -apple-system, BlinkMacSystemFont
- ✅ Title size: 18px, weight 600
- ✅ Button text: 14px
- ✅ Subtitle: 12px

### **Colors**

- ✅ Active: `rgba(34, 197, 94, 0.1)` green
- ✅ Setting: `rgba(251, 191, 36, 0.1)` yellow
- ✅ Paused: `rgba(239, 68, 68, 0.1)` red
- ✅ Border: `#333333` for dark theme

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Sidebar không xuất hiện**: Check console log, có thể cần refresh page
2. **Buttons không hoạt động**: Check keyboard shortcuts, có thể conflict với
   YouTube
3. **Legacy fallback**: Nếu sidebar fail, buttons sẽ xuất hiện trên YouTube
   controls

### **Debug Commands**

```javascript
// Check sidebar instance
window.fluentFlowSidebar = document.querySelector('.fluent-flow-sidebar')

// Check toggle button
window.fluentFlowToggle = document.querySelector(
  '.fluent-flow-sidebar-youtube-toggle'
)

// Manual toggle
document.querySelector('.fluent-flow-sidebar-toggle')?.click()
```

## 📊 **Performance Metrics**

### **Load Time**

- Sidebar initialization: < 1s
- First render: < 200ms
- Animation duration: 300ms

### **Memory Usage**

- Minimal DOM elements
- Efficient event listeners
- Proper cleanup on destroy

## ✅ **Expected Results**

1. **FluentFlow icon** xuất hiện bên YouTube controls
2. **Click icon** → Sidebar mở với animation mượt
3. **8 buttons** được group thành 4 categories
4. **Keyboard shortcuts** hoạt động trong/ngoài sidebar
5. **Button states** update real-time
6. **Mobile responsive** design
7. **Clean YouTube interface** - chỉ 1 toggle button

---

**🎉 Thành công khi:** Tất cả features hoạt động, UI đẹp, performance tốt, không
có errors trong console!
