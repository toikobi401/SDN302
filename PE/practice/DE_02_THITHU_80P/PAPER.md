# SDN302 — PRACTICAL EXAM (ĐỀ THI THỬ)

**Thời gian: 80 phút** · Tổng điểm: 10

---

## Thông tin đề thi

**Course:** SDN302 · **Tools:** Visual Studio Code, MongoDB Compass, Postman / Thunder Client, MongoDB V6 trở lên
**Yourdomain:** `localhost:5000`

### INSTRUCTIONS

Đọc kỹ hướng dẫn trước khi làm bài.

- Không được chia sẻ dữ liệu với người khác bằng bất kỳ thiết bị nào.
- **Không được cài thêm thư viện trong lúc thi.** Dùng đúng bộ thư viện trong `package.json`.

**QUAN TRỌNG — phải làm đủ các bước sau, thiếu là 0 điểm:**

1. Bài nộp **không được có lỗi cú pháp**. Có lỗi cú pháp / lỗi biên dịch → **0 điểm toàn bài**.
2. Toàn bộ dữ liệu phải lấy từ các file JSON trong thư mục `All`.
3. Tạo database MongoDB tên **`SDN302_SU26_ClinicDB`**.
4. Lưu **connection string** và **port** trong file `.env`. Không làm → **0 điểm**.
5. Xoá thư mục `node_modules` trước khi nộp.

---

## Mô tả bài toán

Xây dựng một phần của **CLINIC APPOINTMENT SYSTEM** (hệ thống đặt lịch khám).

Một khoa (`department`) có nhiều bác sĩ. Một bác sĩ có nhiều lịch hẹn (`appointment`).
Mỗi lịch hẹn thuộc về đúng một bác sĩ và đúng một bệnh nhân (`patient`).

Database gồm **5 collections**:

```js
departments ({
    depName:   { type: String, required: true },
    location:  { type: String, required: true },
});

doctors ({
    doctorName: { type: String, required: true },
    depId:      { type: mongoose.Schema.Types.ObjectId, ref: "department", required: true },
    specialty:  { type: String, required: true },
    fee:        { type: Number, required: true, min: 0 },
});

patients ({
    patientName: { type: String, required: true },
    phone:       { type: String, required: true },
    dob:         { type: String, required: true },
});

appointments ({
    doctorId:  { type: mongoose.Schema.Types.ObjectId, ref: "doctor",  required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "patient", required: true },
    startTime: { type: String, required: true },     // "2026-03-02T08:00"
    endTime:   { type: String, required: true },     // "2026-03-02T09:00"
    status:    { type: String, required: true },     // BOOKED | DONE | CANCELED
    fee:       { type: Number, required: true },
});

users ({
    name:       { type: String, required: true },
    role:       { type: String, required: true },    // staff | manager
    access_key: { type: String, required: true },
});
```

### Authorization

Các endpoint ghi chú **"Protected endpoint"** yêu cầu header `access_key`.
Trả về **403** kèm message tương ứng trong **cả ba** trường hợp:

| Trường hợp | Message |
|---|---|
| Không có header `access_key` | `Missing access_key` |
| `access_key` không khớp user nào | `Invalid access_key` |
| Role không đúng yêu cầu | `Permission denied` |

---

## Question 1 (2.0 marks)

`GET /api/doctors`

Trả về danh sách bác sĩ, **kèm tên khoa**. Hỗ trợ lọc bằng query parameter (có thể kết hợp nhiều điều kiện, không truyền thì bỏ qua điều kiện đó):

| Query param | Ý nghĩa |
|---|---|
| `depId` | chỉ lấy bác sĩ thuộc khoa này |
| `specialty` | khớp **gần đúng**, không phân biệt hoa thường |
| `maxFee` | phí khám **nhỏ hơn hoặc bằng** giá trị này |

Sắp xếp theo `fee` **giảm dần**.

**Response mẫu** — `GET /api/doctors?specialty=tim&maxFee=500000`

```json
[
  {
    "doctorName": "Nguyen Van An",
    "specialty": "Tim mach",
    "fee": 300000,
    "departmentName": "Noi tong quat"
  }
]
```

**Business Rules**
- `depId` sai định dạng ObjectId → **400**, message `Invalid depId: <giá trị>`.
- Không có bác sĩ nào khớp → trả về mảng rỗng `[]` với status **200** (không phải 404).

---

## Question 2 (2.0 marks)

`GET /api/doctors/:doctorId/appointments`

Trả về thông tin bác sĩ và **danh sách lịch hẹn** của bác sĩ đó.

**Response mẫu**

```json
{
  "doctorName": "Nguyen Van An",
  "specialty": "Tim mach",
  "totalAppointments": 3,
  "appointments": [
    {
      "patientName": "Vu Thi Lan",
      "startTime": "2026-03-02T08:00",
      "endTime": "2026-03-02T09:00",
      "status": "BOOKED"
    }
  ]
}
```

**Business Rules**
- `doctorId` sai định dạng ObjectId → **400**, message `Invalid doctorId: <giá trị>`.
- Không tìm thấy bác sĩ → **404**, message `Doctor with id = <doctorId> not found`.
- Lịch hẹn sắp xếp theo `startTime` **tăng dần**.
- `totalAppointments` là số lịch hẹn trả về.

---

## Question 3 (3.0 marks)

`POST /api/appointments` — **Protected endpoint** (role `staff` hoặc `manager`)

Đặt một lịch hẹn mới.

**Request body**

```json
{
  "doctorId": "...",
  "patientId": "...",
  "startTime": "2026-03-02T15:00",
  "endTime": "2026-03-02T16:00"
}
```

**Business Rules** — kiểm tra theo đúng thứ tự dưới đây:

1. Thiếu bất kỳ field nào trong 4 field trên → **400**, message `All fields are required`.
2. `doctorId` hoặc `patientId` sai định dạng ObjectId → **400**, message `Invalid <tên field>: <giá trị>`.
3. `startTime` phải **nhỏ hơn** `endTime` → nếu không, **400**, message `startTime must be before endTime`.
4. Không tìm thấy bác sĩ → **404**, message `Doctor with id = <doctorId> not found`.
5. Không tìm thấy bệnh nhân → **404**, message `Patient with id = <patientId> not found`.
6. Bác sĩ đó đã có lịch hẹn **trùng khung giờ** (và lịch đó **chưa bị huỷ**) → **409**,
   message `Doctor is not available in this time range`.
   *Hai khoảng thời gian được coi là trùng khi chúng có phần giao nhau thực sự.
   Hai lịch chỉ **chạm mép** nhau (lịch cũ kết thúc 09:00, lịch mới bắt đầu 09:00) thì **không** tính là trùng.*
7. Hợp lệ → tạo lịch hẹn mới với `status` = `"BOOKED"` và `fee` **lấy từ `fee` của bác sĩ**
   (không lấy từ request body), trả về **201**.

**Response mẫu (201)**

```json
{
  "message": "Appointment booked successfully",
  "appointment": {
    "doctorName": "Nguyen Van An",
    "patientName": "Vu Thi Lan",
    "startTime": "2026-03-02T15:00",
    "endTime": "2026-03-02T16:00",
    "status": "BOOKED",
    "fee": 300000
  }
}
```

---

## Question 4 (3.0 marks)

`GET /api/reports/doctors/workload` — **Use Aggregation Pipeline**

Báo cáo khối lượng công việc của từng bác sĩ.

**Response mẫu**

```json
[
  {
    "doctorName": "Nguyen Van An",
    "departmentName": "Noi tong quat",
    "totalAppointments": 3,
    "totalPatients": 3,
    "totalRevenue": 900000
  },
  {
    "doctorName": "Le Manh Cuong",
    "departmentName": "Ngoai chan thuong",
    "totalAppointments": 1,
    "totalPatients": 1,
    "totalRevenue": 400000
  }
]
```

**Business Rules**
- **Không** tính các lịch hẹn có `status` = `"CANCELED"`.
- `totalPatients` là số bệnh nhân **khác nhau** (một bệnh nhân khám 3 lần chỉ tính 1).
- `totalRevenue` là tổng `fee` của các lịch hẹn được tính.
- Bác sĩ **không có lịch hẹn nào** thì **không** xuất hiện trong báo cáo.
- Sắp xếp theo `totalRevenue` **giảm dần**.

---

*-- The end of test --*
