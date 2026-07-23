# Kịch Bản Test — VoucherProtocol Demo

> Tài liệu này bám theo `USE_CASES.md` (UC-01 → UC-23 + 25 use case nghiệp vụ Phần I) và đối chiếu với hành vi
> thực tế đang cài đặt trong `index.html` / `app.js` / `data.json` của demo hiện tại. Chạy demo bằng
> `python3 -m http.server 8080` rồi mở `http://localhost:8080`.
>
> Quy ước: mỗi kịch bản có **Vai trò/Ví cần dùng**, **Các bước**, **Kết quả mong đợi**, và **UC liên quan**.
> Tên ví ở cột "Vai trò/Ví" là tên hiển thị trong modal "Kết Nối Ví" (mở bằng nút *Kết Nối Ví* trên header).
> Sau khi mở rộng dữ liệu, mỗi tenant có nhiều operator — chọn bất kỳ ví nào cùng nhóm mô tả đều test được,
> trừ khi kịch bản chỉ đích danh một ví cụ thể (vì nó phụ thuộc trạng thái dữ liệu đặc thù của ví đó).

---

## Nhóm 1 — Khách (chưa kết nối ví, Public)

Trước khi kết nối bất kỳ ví nào, vai trò mặc định là "Công chúng".

| # | Kịch bản | Các bước | Kết quả mong đợi | UC |
|---|---|---|---|---|
| 1.1 | Xác minh chứng chỉ hợp lệ | Vào "Xác minh nhanh" → nhập mã `CERT-8899-ABCD` → Kiểm tra | Hiện đúng tiêu đề, chủ sở hữu, badge "HỢP LỆ", thanh tiến độ đồng ký, nút "Xem Nội Dung Trên IPFS" | UC-22, 24 |
| 1.2 | Xác minh mã không tồn tại | Nhập mã ngẫu nhiên `CERT-0000-ZZZ` → Kiểm tra | Hiện khối "Không tìm thấy chứng từ với mã này trên chuỗi" | UC-22 |
| 1.3 | Xác minh chứng chỉ đã thu hồi | Nhập `VC-5501-EDU` → Kiểm tra | Badge "KHÔNG CÒN HIỆU LỰC", banner đỏ hiện lý do thu hồi, khối trust bị làm mờ (grayscale) | UC-14, 22 |
| 1.4 | Xem IPFS nhiều trang | Từ kết quả 1.1, bấm "Xem Nội Dung Trên IPFS" | Modal hiện đúng 3 trang nội dung, nút Trước/Sau hoạt động, disable đúng ở trang đầu/cuối | — |
| 1.5 | Sổ Cái Công Khai — tổng quan | Vào "Sổ Cái Công Khai" | TVL, số tổ chức, tổng chứng từ hiển thị đúng; bảng xếp hạng uy tín sắp theo stake giảm dần | UC-23 |
| 1.6 | Danh sách nhân sự theo doanh nghiệp | Trong Explorer, đổi dropdown sang từng tổ chức (ABC/Bách Khoa/XYZ/Blockchain Việt/VNC) | Bảng nhân sự cập nhật đúng theo tổ chức chọn; gõ ô tìm kiếm lọc đúng theo tên; nếu >10 người thấy nút "Xem thêm" | UC-23 |
| 1.7 | Tra cứu lịch sử khôi phục ví | Nhập "Lê F" hoặc địa chỉ `0xOLD...F001` vào ô tra cứu khôi phục | Hiện đúng bản ghi: ai là "hậu duệ", ví gốc, ngày khôi phục, lý do | UC-25 |
| 1.8 | Chặn trang cần đăng nhập | Chưa kết nối ví, thử bấm "Hồ Sơ Cá Nhân" / "Kho Chứng Từ Của Tôi" từ sidebar | Overlay "Cần Kết Nối Ví" hiện chặn toàn bộ nội dung, không có gì rò rỉ phía sau | — |
| 1.9 | Modal kết nối ví đầy đủ & cuộn được | Bấm "Kết Nối Ví" | Danh sách liệt kê **toàn bộ** ví hệ thống (operator + admin/QL vận hành/treasury của mọi tenant + Protocol Admin), khung cuộn được, không tràn màn hình | — |
| 1.10 | Thử đổi vai trò khi chưa kết nối | Bấm tab "Nhân viên"/"Công ty"/"Protocol Admin" khi chưa kết nối | Tự động mở modal kết nối ví thay vì báo lỗi khó hiểu | — |

---

## Nhóm 2 — Người mới: Gia nhập làm Operator

**Ví dùng:** `Nguyễn Văn A` (id nội bộ `me`) — ví seed duy nhất ở trạng thái "chưa từng gia nhập" (`stakeEth: 0`,
`isActive: false`).

| # | Kịch bản | Các bước | Kết quả mong đợi | UC |
|---|---|---|---|---|
| 2.1 | Kết nối ví mới, kiểm tra Hồ Sơ | Kết nối ví Nguyễn Văn A → vào "Hồ Sơ Cá Nhân" | Badge "Khách"; thẻ "Tư Cách Operator" ghi "Chưa gia nhập tổ chức nào" kèm nút "Gia nhập ngay →"; cọc = 0 ETH | 2.1 (Phần I) |
| 2.2 | Bị chặn vào vai trò Nhân viên | Bấm tab "Nhân viên" | Toast đỏ "Ví này chưa gia nhập tổ chức nào — hãy Gia Nhập Làm Nhân Viên trước", **không** vào được tab | — |
| 2.3 | Đặt cọc dưới mức tối thiểu | Vào "Gia Nhập Làm Nhân Viên" → chọn "Công ty CP Giáo dục ABC" → nhập cọc < mức tối thiểu hiển thị → Kích Hoạt | Toast lỗi đúng số tiền tối thiểu, ô "Số ETH đặt cọc" viền đỏ, hộp tổng hợp lỗi hiện phía trên form | UC-03 |
| 2.4 | Gia nhập thành công | Nhập cọc ≥ mức tối thiểu, bấm Kích Hoạt | Toast thành công; quay lại Hồ Sơ thấy badge đổi thành "Operator đang hoạt động", thẻ cọc cập nhật đúng số; tổng TVL ở Explorer tăng tương ứng | UC-03 |
| 2.5 | Không gia nhập đè lần 2 | Sau 2.4, vào lại "Gia Nhập Làm Nhân Viên" | Bị khoá bởi overlay "Không Cần Đăng Ký Thêm" — thông báo đã là nhân viên đang hoạt động tại đúng tổ chức | UC-03 |
| 2.6 | Vẫn đăng ký doanh nghiệp được | Sau 2.4, vào "Đăng Ký Doanh Nghiệp" | **Không** bị khoá (operator thường không phải chủ doanh nghiệp) — form vẫn dùng được bình thường | — |

---

## Nhóm 3 — Operator đã hoạt động

**Ví dùng:** bất kỳ operator `isActive: true` của tenant ABC (vd. `Giảng viên Trần B`, hoặc ví vừa kích hoạt ở
Nhóm 2).

| # | Kịch bản | Các bước | Kết quả mong đợi | UC |
|---|---|---|---|---|
| 3.1 | Phát hành chứng chỉ không cần đồng ký | Vào "Phát hành mới" → chọn loại "Chứng chỉ Cơ bản" → Ký & Lưu | Chứng chỉ mới xuất hiện ngay trong "Lịch sử của bạn"; tra lại ở Verify thấy hợp lệ, không cần chờ đồng ký | UC-15 |
| 3.2 | Phát hành chứng chỉ cần đồng ký | Chọn loại "Chứng chỉ Chuyên gia cao cấp" → Ký & Lưu | Chứng chỉ ở trạng thái "Đang chờ (x/2)"; nếu người ký đã whitelist thì tự tính là 1 chữ ký tin cậy đầu tiên | UC-15 |
| 3.3 | Badge Phê Duyệt hiện đúng ngay khi vào vai trò | Đổi sang vai trò "Nhân viên" (không cần bấm vào tab Phê Duyệt) | Badge đỏ cạnh "Phê duyệt (Đồng ký)" hiện đúng số lượng chờ duyệt ngay lập tức | — (bug đã sửa trong phiên) |
| 3.4 | Tìm kiếm & tải thêm ở Cosign | Vào "Phê Duyệt & Đồng Ký", gõ mã chứng chỉ/tên người nhận vào ô tìm kiếm | Danh sách lọc đúng; nếu >10 dòng chờ duyệt có nút "Xem thêm (n) →" | — |
| 3.5 | Ký duyệt đạt quorum | Ký duyệt đủ số người + đủ vai trò bắt buộc cho 1 chứng chỉ | Sau lần ký cuối, chứng chỉ biến mất khỏi danh sách chờ (đã qualified); tra ở Verify thấy "Đã đạt độ tin cậy cao nhất" | UC-17 |
| 3.6 | Nạp thêm cọc | Vào "Tiền cọc" → nhập số ETH → Nạp Thêm | Số dư cập nhật cộng dồn đúng | UC-04 |
| 3.7 | Rút cọc có xác nhận | Bấm "Gửi Yêu Cầu Rút Tiền Nghỉ Việc" | Modal xác nhận hiện trước, phải bấm "Gửi yêu cầu" mới thực sự gửi; sau đó khối "đang chờ cooldown" xuất hiện | UC-06 |
| 3.8 | Rút tiền có xác nhận | Bấm "Rút Tiền Ngay" trong khối đang chờ | Modal xác nhận riêng biệt hiện trước khi rút; sau khi xác nhận, cọc về 0, tư cách hoạt động kết thúc | UC-07 |
| 3.9 | Cập nhật hồ sơ cá nhân | Vào Hồ Sơ → sửa ô "Hồ Sơ Operator" → Lưu | Nội dung lưu lại, hiện lại đúng khi rời trang rồi quay lại; khối này **ẩn** nếu operator không active | UC-05 |
| 3.10 | Thứ tự thẻ trong Hồ Sơ | Vào Hồ Sơ, tab Tổng quan | Hàng thống kê đầu trang đi đúng thứ tự với 4 thẻ chi tiết bên dưới (Cọc → Vai trò QT → Chứng từ → Uy tín) | — |

---

## Nhóm 4 — Bảo mật & Khôi phục ví

| # | Kịch bản | Các bước | Kết quả mong đợi | UC |
|---|---|---|---|---|
| 4.1 | Thiết lập ví dự phòng qua combobox | Ví operator đang hoạt động → "Ví dự phòng" → gõ tìm tên đồng nghiệp → chọn → Lưu Ví | Ô tìm kiếm lọc theo tên khi gõ, chọn xong hiện đúng tên trong ô + "Ví dự phòng hiện tại: ..." cập nhật | UC-20 |
| 4.2 | Delegate thấy yêu cầu chờ cứu hộ | Kết nối ví `Nguyễn Văn A` (đã là delegate có sẵn của `Giảng viên Lê F`) → vào "Khôi phục khẩn cấp" | Hiện thông tin: sẽ nhận toàn bộ stake + lịch sử của "Giảng viên Lê F" | UC-21 |
| 4.3 | Thực thi khôi phục | Bấm "Thực thi Cứu Hộ" | Thành công; `tenantId`/`stakeEth`/`bio` migrate sang ví hiện tại, nhưng `isActive` vẫn `false` (đúng theo hợp đồng — cần Operator Manager kích hoạt lại) | UC-21 |
| 4.4 | Ví cũ bị recovered không dùng lại được | Ngắt kết nối, thử kết nối lại `Giảng viên Lê F` | Ví này không còn xuất hiện trong danh sách kết nối (đã bị lọc `recovered: true`) | UC-21 |
| 4.5 | Sau khôi phục vẫn phải kích hoạt lại | Kết nối ví Operator Manager của tenant ABC → "Nhân sự" → tìm ví vừa nhận khôi phục | Trạng thái hiện "BẬT HĐ" (chưa active), bấm để kích hoạt lại thành công | UC-08 |

---

## Nhóm 5 — Đăng Ký Doanh Nghiệp (Public, request-only)

| # | Kịch bản | Các bước | Kết quả mong đợi | UC |
|---|---|---|---|---|
| 5.1 | Thiếu trường bắt buộc | Vào "Đăng Ký Doanh Nghiệp" → để trống tên/địa chỉ → Gửi | Các ô trống viền đỏ, hộp tổng hợp lỗi liệt kê đủ các lỗi, toast hiện lỗi đầu tiên | UC-01 (nghiệp vụ) |
| 5.2 | Trùng địa chỉ 3 vai trò | Nhập cùng 1 địa chỉ cho cả Admin/QL Vận hành/Treasury | Bị chặn với lỗi "phải là 3 địa chỉ khác nhau", cả 3 ô viền đỏ | UC-01 |
| 5.3 | Nộp đơn hợp lệ | Điền đủ thông tin hợp lệ → Gửi | Toast thành công; đơn xuất hiện trong danh sách chờ duyệt khi vào vai trò Protocol Admin | UC-01 |
| 5.4 | Chủ doanh nghiệp không nộp đơn thêm | Kết nối ví Admin của 1 tenant → vào "Đăng Ký Doanh Nghiệp" | Bị khoá bởi overlay "đã giữ vai trò quản trị một doanh nghiệp" | UC-01 |

---

## Nhóm 6 — Tenant Admin

**Ví dùng:** `"{Tên tổ chức} — Admin"` (vd. `Công ty CP Giáo dục ABC — Admin`).

| # | Kịch bản | Các bước | Kết quả mong đợi | UC |
|---|---|---|---|---|
| 6.1 | Vào đúng vai trò Công ty | Kết nối ví Admin → tab "Công ty" | Vào được, sidebar hiện đúng nhóm menu Tenant | UC-01, 08 |
| 6.2 | Đổi treasury trùng Admin/QL Vận hành | "Đổi Tài Khoản Nhận Tiền Quỹ" → dán đúng địa chỉ Admin hiện tại → Cập Nhật | Bị chặn "không được trùng Admin hoặc QL Vận hành", ô viền đỏ | UC-09 |
| 6.3 | Đổi treasury hợp lệ | Dán địa chỉ mới bất kỳ → Cập Nhật | Cập nhật thành công, hiện đúng địa chỉ mới ở "Tài khoản quỹ hiện tại" | UC-09 |
| 6.4 | Thu hồi chứng chỉ có xác nhận | "Thu Hồi Chứng Chỉ" → nhập lý do → bấm "Thu hồi" ở 1 dòng | Modal xác nhận hiện trước (nêu rõ mã + chủ sở hữu); sau xác nhận, trạng thái đổi "ĐÃ THU HỒI", tra lại ở Verify thấy đúng lý do | UC-14, 16 |
| 6.5 | Tìm kiếm/sắp xếp bảng Thu Hồi | Gõ mã chứng chỉ vào ô tìm kiếm, đổi dropdown sắp xếp theo Trạng thái | Bảng lọc/sắp xếp đúng, có nút "Xem thêm" nếu tenant có >10 chứng từ | — |

---

## Nhóm 7 — Tenant Operator Manager

**Ví dùng:** `"{Tên tổ chức} — QL Vận Hành"`.

| # | Kịch bản | Các bước | Kết quả mong đợi | UC |
|---|---|---|---|---|
| 7.1 | Nhân Sự — tìm kiếm & sắp xếp | Vào "Nhân sự & Phân quyền", gõ tên vào ô tìm kiếm, thử cả 3 kiểu sắp xếp | Danh sách lọc/sắp xếp đúng; ô tìm kiếm không mất focus khi gõ liên tục | UC-08 |
| 7.2 | Bật/tắt tư cách hoạt động | Bấm nút trạng thái của 1 nhân viên | Đổi trạng thái ngay, không cần xác nhận thêm (đây là thao tác thuận nghịch, không phải huỷ diệt) | UC-07, 08 |
| 7.3 | Không kích hoạt được ví chưa từng cọc | Thử bật hoạt động cho một ví `stakeEth: 0` | Bị chặn: "Ví này chưa từng đặt cọc — không có gì để kích hoạt" | UC-08 |
| 7.4 | Hard-slash có xác nhận | "Xử phạt vi phạm" → menu Phạt → "Hard-slash: Tịch thu 100%" | Modal xác nhận nêu rõ tên nhân viên + hành động không thể hoàn tác; sau xác nhận mới trừ cọc | UC-10 |
| 7.5 | Soft-slash tự tạm ngưng dưới ngưỡng | Soft-slash một nhân viên đang gần mức cọc tối thiểu bằng mã lỗi nặng | Sau khi trừ, nếu còn lại < mức tối thiểu → tự động chuyển "Ngưng hoạt động", toast nêu rõ | UC-11 |
| 7.6 | Đổi mức cọc tối thiểu / cooldown | "Tham Số Hợp Đồng" → kéo thanh trượt → Cập nhật Chuỗi | Giá trị mới lưu lại; nhân viên đang hoạt động với mức cọc cũ **không** bị ép nộp thêm ngay (không hồi tố) | UC-12, 13 |
| 7.7 | Bật Đồng Ký không tự nhảy về tắt | Tick checkbox "Bật Đồng Ký" cho 1 loại chứng chỉ đang tắt | Checkbox giữ nguyên trạng thái vừa tick (không tự bật lại thành tắt), các ô Số Chữ Ký/Cọc Tối Thiểu/Vai Trò được mở khoá theo | — (bug đã sửa trong phiên) |
| 7.8 | Whitelist đồng ký — tìm kiếm | "Whitelist & Vai Trò Đồng Ký" → gõ tên vào ô tìm kiếm | Bảng lọc đúng theo tên; tick/gỡ whitelist và đổi vai trò hoạt động bình thường | UC-19 |
| 7.9 | Thêm mã lỗi vi phạm mới | Nhập mã + mô tả + % cọc → Thêm mã lỗi | Mã mới xuất hiện trong bảng, dùng được ngay khi soft-slash | UC-14 (kỹ thuật) |
| 7.10 | Khôi phục khẩn cấp không có ví dự phòng | "Khôi phục hộ nhân viên" → chọn 1 nhân viên mất ví, không có delegate → nhập ví mới → Chỉ định | Chuyển toàn bộ tài sản sang ví mới, nhân viên biến mất khỏi danh sách cần khôi phục | UC-22 |

---

## Nhóm 8 — Protocol Admin

**Ví dùng:** `Protocol Admin`.

| # | Kịch bản | Các bước | Kết quả mong đợi | UC |
|---|---|---|---|---|
| 8.1 | Duyệt đơn đăng ký | "Quản Trị Hệ Sinh Thái" → Duyệt 1 đơn đang chờ | Đơn biến mất khỏi danh sách chờ, tổ chức mới xuất hiện trong bảng tổ chức + chọn được ở mọi dropdown tổ chức nơi khác trong app | UC-01 |
| 8.2 | Từ chối đơn | Bấm "Từ chối" ở 1 đơn | Đơn biến mất, toast nêu rõ tên tổ chức bị từ chối | UC-01 |
| 8.3 | Tạo tổ chức thủ công thiếu trường | "Tạo Tổ Chức Mới" → để trống vài trường → Khởi Tạo | Các ô trống viền đỏ, hộp lỗi tổng hợp hiện đúng, không tạo tổ chức | UC-01 |
| 8.4 | Tạo tổ chức thủ công hợp lệ | Điền đủ + 3 địa chỉ khác nhau → Khởi Tạo | Tổ chức mới xuất hiện ngay trong bảng, dùng được cho Gia Nhập/kết nối ví Admin mới | UC-01 |
| 8.5 | Đình chỉ tổ chức | Bấm "Đình chỉ" ở 1 tổ chức đang hoạt động | Trạng thái đổi "SUSPENDED"; kết nối ví operator thuộc tổ chức đó thử Gia Nhập/Phát hành mới → bị từ chối do tổ chức tạm khoá | UC-02 |
| 8.6 | Vẫn rút cọc được khi tổ chức bị đình chỉ | Với 1 operator đã gửi yêu cầu rút cọc **trước** khi tổ chức bị đình chỉ ở 8.5, thử "Rút Tiền Ngay" | Vẫn rút thành công (executeUnstake không kiểm tra `isActive` của tenant) | UC-02 |
| 8.7 | Khôi phục hoạt động tổ chức | Bấm "Khôi phục HĐ" | Trạng thái về "ACTIVE", các thao tác gia nhập/phát hành mới hoạt động lại bình thường | UC-02 |
| 8.8 | Protocol Admin không kiêm vai trò khác | Thử bấm tab "Nhân viên" hoặc "Công ty" | Bị chặn ngay với thông báo "Ví Protocol Admin không được kiêm vai trò Operator/..." | UC-01, 21 (Phần I) |

---

## Nhóm 9 — Kiểm tra xuyên suốt (Cross-cutting)

| # | Kịch bản | Các bước | Kết quả mong đợi |
|---|---|---|---|
| 9.1 | Đổi ví không dính dữ liệu ví cũ | Kết nối ví A, vào Hồ Sơ/Kho Chứng Từ → ngắt kết nối → kết nối ví B khác hẳn | Toàn bộ dữ liệu hiển thị (tên, địa chỉ, avatar, thống kê, hoạt động) đổi đúng theo ví B, không còn sót thông tin của ví A |
| 9.2 | Vai trò không phù hợp với ví mới | Đang ở vai trò "Công ty" với ví Admin, ngắt kết nối rồi kết nối 1 ví operator thường | Tự động rơi về vai trò "Công chúng" thay vì giữ nguyên vai trò cũ không còn hợp lệ |
| 9.3 | Toast xếp chồng | Thực hiện liên tiếp 2-3 thao tác nhanh (vd. nạp cọc rồi lưu hồ sơ) | Nhiều toast cùng hiển thị xếp chồng, mỗi cái tự biến mất độc lập sau 3s, có thể đóng tay từng cái |
| 9.4 | Empty-state khi tìm kiếm rỗng | Ở bất kỳ bảng nào có ô tìm kiếm (Nhân Sự, Xử Phạt, Thu Hồi, Whitelist, Explorer...), gõ chuỗi chắc chắn không khớp | Hiện khối "Không tìm thấy ... phù hợp" thay vì bảng trắng trơn |
| 9.5 | Responsive mobile | Thu nhỏ trình duyệt xuống ~375px | Sidebar ẩn thành nút hamburger, mở ra dạng drawer che toàn màn hình, đóng khi bấm ra ngoài hoặc chọn 1 mục; role-switcher cuộn ngang không vỡ layout |
| 9.6 | Sidebar active-state | Chuyển qua lại giữa các trang trong cùng vai trò | Mục đang chọn luôn có nền màu + icon trắng khác biệt rõ với các mục còn lại |

---

## Bảng đối chiếu nhanh UC (Phần II, kỹ thuật) ↔ nơi test trong demo

| UC | Tên | Nơi test |
|---|---|---|
| UC-01 | `createTenant` | Nhóm 8.3–8.4 |
| UC-02 | `setTenantStatus` | Nhóm 8.5–8.7 |
| UC-03 | `joinAsOperator` | Nhóm 2 |
| UC-04 | `topUpStake` | 3.6 |
| UC-05 | `updateOperatorMetadata` | 3.9 |
| UC-06 | `requestUnstake` | 3.7 |
| UC-07 | `executeUnstake` | 3.8, 8.6 |
| UC-08 | `setOperatorStatus` | 7.1–7.3, 4.5 |
| UC-09 | `setTreasury` | 6.2–6.3 |
| UC-10 | `slashOperator` (hard) | 7.4 |
| UC-11 | `softSlashOperator` | 7.5 |
| UC-12/13 | `setMinOperatorStake` / `setUnstakeCooldown` | 7.6 |
| UC-14 | `setViolationPenalty` | 7.9 |
| UC-15 | `registerWithSignature` | 3.1–3.2 |
| UC-16 | `revokeDocument` | 6.4 |
| UC-17 | `coSignDocumentWithSignature` | 3.5 |
| UC-18 | `setCoSignPolicy` | 7.7 |
| UC-19 | `setCoSignOperator` | 7.8 |
| UC-20 | `setRecoveryDelegate` | 4.1 |
| UC-21 | `recoverOperatorByDelegate` | 4.2–4.4 |
| UC-22 | `recoverOperatorByAdmin` | 7.10 |
| UC-23 | `grantRole` (chống xung đột vai trò) | Không có UI thao tác trực tiếp trong demo — chỉ thể hiện gián tiếp qua việc `createTenant`/`Đăng Ký Doanh Nghiệp` từ chối 3 địa chỉ trùng nhau (5.2, 8.3) |

**Ghi chú phạm vi**: demo là giao diện mô phỏng phía client (không có smart contract thật phía sau), nên các
kịch bản trên kiểm tra **hành vi nghiệp vụ và UI** đúng theo mô tả hợp đồng ở `USE_CASES.md`, không phải kiểm
thử on-chain thực tế (gas, revert message chính xác, chữ ký EIP-712...) — phần đó thuộc bộ test Solidity ở
`verzik-blockchain/test/`.
