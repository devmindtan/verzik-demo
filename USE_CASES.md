# Use Case Toàn Bộ Hệ Thống `VoucherProtocol`

> Tài liệu được tổng hợp trực tiếp từ code hiện tại trong `contracts/` (không dựa vào bản mô tả cũ):
> `VoucherProtocol.sol`, `VoucherProtocolHelper.sol`, `OperatorLib.sol`, `DocumentLib.sol`, `CoSignLib.sol`,
> `RecoveryLib.sol`, `VoucherProtocolReader.sol`, `VoucherTypes.sol`, `IVoucherProtocolErrorsEvents.sol`.

> Tài liệu gồm 2 phần:
> - **Phần I** — dành cho khách hàng/đối tác kinh doanh, viết bằng ngôn ngữ nghiệp vụ, không cần hiểu blockchain.
> - **Phần II** — chi tiết kỹ thuật đầy đủ (dành cho đội phát triển, kiểm thử, tích hợp).

---

# PHẦN I — USE CASE DÀNH CHO KHÁCH HÀNG (Không cần kiến thức kỹ thuật)

## 0. Tính ứng dụng thực tế — hệ thống này giải quyết vấn đề gì?

**Vấn đề cốt lõi mà mọi doanh nghiệp phát hành giấy tờ/chứng từ đều gặp:**
- Giấy tờ giấy dễ làm giả, khó xác minh nhanh (nhà tuyển dụng gọi điện xác minh bằng cấp mất vài ngày; khách hàng cầm voucher giấy không biết thật hay photo lại).
- Muốn có bên thứ ba đứng ra "làm chứng" (công chứng viên, ngân hàng bảo lãnh...) thì tốn phí, tốn thời gian, và vẫn phải tin tưởng đơn phương vào bên đó.
- Nội bộ doanh nghiệp khó kiểm soát: một nhân viên có thể tự ý phát hành chứng từ khống nếu không có cơ chế ràng buộc trách nhiệm rõ ràng, và khi phát hiện gian lận thì tài sản/danh tiếng đã thiệt hại xong rồi.
- Muốn bắt buộc "nhiều người cùng duyệt" cho các chứng từ giá trị lớn thì phải xây quy trình giấy tờ nội bộ phức tạp, dễ bị qua mặt (một chữ ký giả, một con dấu giả là xong).

**Hệ thống `VoucherProtocol` giải quyết bằng cách:**
- Biến mỗi chứng từ thành một "bản ghi không thể sửa/xoá âm thầm" trên blockchain — ai cũng tra cứu được thật/giả trong vài giây, miễn phí, không cần gọi điện xác minh.
- Bắt buộc người phát hành phải **đặt cọc tiền thật** trước khi được quyền ký chứng từ — nếu gian lận, doanh nghiệp có thể tịch thu cọc ngay lập tức. Đây là cơ chế "đặt cọc để đảm bảo trách nhiệm" hoàn toàn tự động, không cần kiện tụng.
- Cho phép doanh nghiệp tự thiết lập quy tắc "cần bao nhiêu người, vai trò gì, phải cùng xác nhận" cho từng loại chứng từ — tương đương một hệ thống multi-sig nội bộ nhưng làm bằng hợp đồng thông minh, không thể bị qua mặt bằng chữ ký giấy giả.
- Tách bạch quyền lực (chủ doanh nghiệp / người quản lý nhân sự phát hành / tài khoản giữ tiền quỹ là 3 người khác nhau bắt buộc) để giảm rủi ro gian lận nội bộ.
- Khách hàng cuối — người nhận chứng từ — **không cần biết gì về blockchain, không cần ví, không cần trả phí** để tra cứu xác minh.

**Một số ngành/nghiệp vụ có thể áp dụng ngay:**

| Ngành / Nghiệp vụ | "Chứng từ" cụ thể là gì | Ai đóng vai "nhân viên phát hành" | Giá trị mang lại |
|---|---|---|---|
| **Giáo dục & đào tạo** | Văn bằng, chứng chỉ tốt nghiệp, chứng chỉ khoá học online | Phòng đào tạo / giảng viên phụ trách | Nhà tuyển dụng xác minh bằng cấp thật/giả tức thì, chống nạn bằng giả tràn lan trên thị trường lao động |
| **Bán lẻ & thương mại điện tử** | Voucher giảm giá, thẻ quà tặng, mã ưu đãi | Hệ thống marketing / đại lý phân phối | Chống làm giả mã voucher, chống một mã bị dùng lại nhiều lần ở nhiều nơi |
| **Bảo hành sản phẩm** | Phiếu bảo hành điện tử cho hàng điện máy, xe cộ | Đại lý/cửa hàng phân phối chính hãng | Khách hàng tra cứu còn hạn bảo hành hay không mà không cần giữ giấy bảo hành vật lý, hãng kiểm soát được đại lý phát hành đúng chính sách |
| **Công chứng & hợp đồng số** | Hợp đồng, giấy uỷ quyền, di chúc số | Công chứng viên số / đại diện pháp lý | Áp dụng cơ chế "đồng ký" thay cho việc phải có nhiều bên ký tay + đóng dấu trực tiếp; hồ sơ minh bạch, không thể chỉnh sửa sau khi ký |
| **Bảo hiểm** | Hợp đồng bảo hiểm, chứng nhận bồi thường/giải quyết claim | Nhân viên thẩm định | Hợp đồng/khoản bồi thường giá trị lớn bắt buộc có thêm quản lý cấp cao đồng ký mới có hiệu lực, giảm rủi ro một cá nhân duyệt khống |
| **Chuỗi cung ứng & xuất nhập khẩu** | Chứng nhận xuất xứ (C/O), chứng nhận chất lượng (QC), vận đơn số | Nhà máy / đơn vị kiểm định độc lập | Nhiều bên trong chuỗi (nhà máy, đơn vị kiểm định, đối tác nhập khẩu) cùng xác nhận trước khi lô hàng được công nhận đạt chuẩn |
| **Tài chính nội bộ doanh nghiệp** | Chứng từ phê duyệt chi tiêu, thanh toán giá trị lớn | Kế toán / kiểm soát viên | Bắt buộc đủ số lượng **và** đủ vai trò chuyên môn (kế toán + kiểm soát + giám đốc) cùng duyệt mới hợp lệ — chuẩn hoá quy trình 4 mắt (four-eyes principle) |
| **Định danh & thẩm định đối tác (KYC/KYB B2B)** | Chứng nhận "đã qua thẩm định" của một tổ chức | Bộ phận tuân thủ (compliance) | Đối tác khác tin tưởng ngay một hồ sơ đã qua thẩm định mà không cần thẩm định lại từ đầu, tiết kiệm thời gian hợp tác |

**Vì sao chọn nền tảng blockchain thay vì một database quản lý nội bộ thông thường?**
- **Minh bạch hai chiều**: doanh nghiệp không thể âm thầm sửa/xoá lịch sử chứng từ đã phát hành, mà khách hàng cũng không thể giả mạo dữ liệu để lừa doanh nghiệp — cả hai bên cùng tin vào một nguồn sự thật duy nhất.
- **Không phụ thuộc một máy chủ trung tâm**: dữ liệu không "biến mất" nếu doanh nghiệp đổi nhà cung cấp phần mềm, sập server, hay ngừng kinh doanh — chứng từ vẫn tồn tại và tra cứu được.
- **Chi phí vận hành thấp hơn mô hình có bên thứ ba bảo lãnh truyền thống** (không cần trả phí công chứng/bảo lãnh cho từng giao dịch), trong khi vẫn giữ được mức độ tin cậy tương đương hoặc cao hơn nhờ cơ chế đặt cọc kinh tế.
- **Ràng buộc trách nhiệm bằng tiền thật (stake), không chỉ bằng quy định giấy tờ** — vi phạm bị xử phạt tự động, không cần quy trình kỷ luật nội bộ kéo dài.

## Các "nhân vật" trong hệ thống

| Vai trò trong đời thực | Vai trò trong hệ thống | Họ làm gì |
|---|---|---|
| **Đơn vị vận hành nền tảng** | Protocol Admin | Duyệt cho từng doanh nghiệp (tổ chức) được tham gia hệ thống, có quyền tạm khoá một tổ chức nếu vi phạm điều khoản dịch vụ. Không được phép tự kinh doanh trong bất kỳ tổ chức nào (tránh xung đột lợi ích, "vừa đá bóng vừa thổi còi"). |
| **Doanh nghiệp / Tổ chức tham gia** | Tenant | Một khách hàng doanh nghiệp của nền tảng (vd: công ty phát hành chứng chỉ, đơn vị công chứng số, sàn phát hành voucher...). Mỗi doanh nghiệp hoạt động hoàn toàn độc lập, dữ liệu không lẫn với doanh nghiệp khác. |
| **Chủ doanh nghiệp / Quản trị viên tổ chức** | Tenant Admin | Người đứng đầu tổ chức: đổi tài khoản nhận tiền quỹ, có quyền thu hồi chứng từ. |
| **Trưởng phòng vận hành nhân sự phát hành** | Operator Manager | Người quản lý đội ngũ nhân viên phát hành: tuyển/sa thải, xử phạt vi phạm, cấu hình quy định đặt cọc, cấu hình quy tắc đồng thuận. |
| **Nhân viên phát hành chứng từ** | Operator | Nhân viên/đại lý được uỷ quyền ký phát hành chứng từ số thay mặt tổ chức. Phải đặt cọc tiền để đảm bảo trách nhiệm. |
| **Khách hàng cuối** | (không có tài khoản riêng trên hệ thống) | Người nhận chứng từ/voucher, chỉ cần tra cứu để xác minh thật/giả — không cần ví, không cần thao tác gì trên blockchain. |

## Use case theo góc nhìn khách hàng

Xuyên suốt các use case dưới đây, ví dụ minh hoạ dùng một doanh nghiệp giả định: **"Công ty Cổ phần Giáo dục ABC"** — chuyên phát hành chứng chỉ hoàn thành khoá học trực tuyến, để giúp hình dung dòng chảy nghiệp vụ thực tế. Cùng một mô hình này áp dụng tương tự cho voucher bán lẻ, hợp đồng bảo hiểm, chứng từ chuỗi cung ứng, v.v. (xem bảng ngành ở mục 0).

### 1. Đăng ký doanh nghiệp lên nền tảng
- **Tình huống:** Công ty ABC muốn bắt đầu phát hành chứng chỉ số cho học viên trên nền tảng.
- **Diễn biến:** Đơn vị vận hành nền tảng thẩm định hồ sơ pháp lý của ABC, sau đó khởi tạo hồ sơ tổ chức gồm: ai là chủ doanh nghiệp (vd. Giám đốc ABC), ai là trưởng phòng vận hành đội ngũ phát hành (vd. Trưởng phòng Đào tạo), tài khoản nào nhận tiền quỹ phạt (vd. tài khoản Kế toán ABC), mức đặt cọc tối thiểu cho mỗi giảng viên được phép ký chứng chỉ (vd. tương đương 2 triệu đồng quy đổi ETH), và thời gian chờ khi rút cọc (vd. 1 ngày).
- **Điểm mấu chốt:** Ba vai trò chủ doanh nghiệp – trưởng phòng vận hành – tài khoản quỹ **bắt buộc phải là 3 người/ví khác nhau**, hệ thống tự động từ chối nếu ABC cố tình khai trùng một người cho 2-3 vai trò — tránh tình trạng một cá nhân vừa duyệt vừa giữ tiền vừa quản lý toàn quyền.
- **Lợi ích thực tế:** ABC có một "trụ sở số" độc lập hoàn toàn với các doanh nghiệp khác cùng dùng chung nền tảng — dữ liệu, nhân viên, chứng chỉ của ABC không bao giờ lẫn hay bị truy cập chéo sang tổ chức khác.

### 2. Tạm khoá / mở lại hoạt động của một doanh nghiệp
- **Tình huống:** ABC bị phát hiện vi phạm điều khoản dịch vụ (vd. phát hành chứng chỉ cho khoá học không tồn tại), đơn vị vận hành nền tảng cần chế tài ngay.
- **Diễn biến:** Đơn vị vận hành khoá trạng thái hoạt động của ABC. Ngay khi bị khoá: ABC không tuyển thêm được giảng viên mới, không phát hành/đồng ký được chứng chỉ mới nào nữa.
- **Điểm mấu chốt (bảo vệ người vô tội):** Giảng viên nào đã gửi yêu cầu rút cọc từ trước vẫn rút tiền về bình thường sau thời gian chờ — họ không bị "giam" tiền chỉ vì công ty bị khoá. Học viên đã có chứng chỉ hợp lệ trước đó vẫn tra cứu xác minh được bình thường — quyền lợi của người dùng cuối không bị ảnh hưởng bởi tranh chấp giữa nền tảng và doanh nghiệp.
- **Lợi ích thực tế:** Cơ chế chế tài nhắm đúng vào hoạt động phát sinh mới của doanh nghiệp vi phạm, không "trừng phạt oan" nhân viên hay khách hàng không liên quan.

### 3. Tuyển nhân viên phát hành mới
- **Tình huống:** ABC tuyển thêm giảng viên Nguyễn Văn A làm người có quyền ký cấp chứng chỉ.
- **Diễn biến:** Ông A phải tự đặt cọc đúng bằng hoặc nhiều hơn mức tối thiểu ABC quy định (vd. 2 triệu đồng quy đổi), kèm một hồ sơ giới thiệu (thông tin định danh/CV rút gọn). Nếu ABC đang tạm khoá hoạt động, hoặc ông A gửi thiếu tiền cọc, hoặc ông A đã từng là giảng viên active trước đó, hệ thống sẽ từ chối ngay.
- **Điểm mấu chốt:** Khoản cọc là "vật đảm bảo trách nhiệm" bằng tiền thật — không phải lời hứa suông trên hợp đồng lao động giấy. Nếu sau này ông A ký khống chứng chỉ, khoản cọc này có thể bị tịch thu ngay lập tức mà không cần qua toà án hay quy trình kỷ luật kéo dài.
**Lợi ích thực tế:** Doanh nghiệp có một hàng rào kinh tế tự động ngăn nhân viên hành xử tuỳ tiện, thay vì chỉ trông chờ vào quy định nội bộ trên giấy.

### 4. Nhân viên nạp thêm tiền đặt cọc
- **Tình huống:** Ông A muốn được tham gia xác nhận (đồng ký) các chứng chỉ khoá học cao cấp — loại này yêu cầu mức cọc tối thiểu cao hơn mức cọc gia nhập thông thường.
- **Diễn biến:** Ông A chủ động nạp thêm tiền vào khoản cọc hiện có bất cứ lúc nào, miễn đang trong trạng thái hoạt động bình thường.
- **Lợi ích thực tế:** Nhân viên có thể tự nâng cấp "hạng tin cậy" của mình để đảm nhận thêm trách nhiệm, thay vì phải làm lại thủ tục gia nhập từ đầu.

### 5. Nhân viên cập nhật hồ sơ cá nhân
- **Tình huống:** Ông A đổi thông tin liên hệ, hoặc cập nhật thêm chứng chỉ chuyên môn mới của bản thân.
- **Diễn biến:** Ông A tự cập nhật hồ sơ bất kỳ lúc nào khi đang hoạt động, không cần chờ ABC phê duyệt.
- **Lợi ích thực tế:** Hồ sơ định danh luôn cập nhật, phục vụ việc học viên/đối tác tra cứu "ai là người đã ký chứng chỉ này" một cách chính xác, đầy đủ theo thời gian thực.

### 6. Nhân viên xin nghỉ và rút lại tiền cọc
- **Tình huống:** Ông A nghỉ việc tại ABC, muốn lấy lại khoản tiền đã đặt cọc.
- **Diễn biến:** Ông A gửi yêu cầu rút cọc. Hệ thống áp dụng **thời gian chờ bắt buộc** do ABC cấu hình (vd. 1 ngày) trước khi tiền thực sự được hoàn trả. Sau khi hết thời gian chờ, ông A tự thực hiện thao tác rút và nhận lại toàn bộ tiền.
- **Điểm mấu chốt:** Thời gian chờ tồn tại để ABC (qua trưởng phòng vận hành) có đủ thời gian phát hiện và xử lý nếu ông A vừa có hành vi gian lận trước khi nghỉ việc — không để nhân viên "ký khống rồi rút cọc chạy" trong cùng một ngày.
- **Lợi ích thực tế:** Cân bằng giữa quyền lợi chính đáng của nhân viên (được lấy lại tiền của mình) và quyền tự vệ hợp lý của doanh nghiệp.

### 7. Quản lý bật/tắt tư cách hoạt động của nhân viên
- **Tình huống:** Giảng viên B nghỉ thai sản dài hạn, hoặc đang trong diện điều tra nội bộ vì nghi ngờ vi phạm.
- **Diễn biến:** Trưởng phòng vận hành tạm ngưng tư cách hoạt động của giảng viên B bất kỳ lúc nào (không cần chờ B đồng ý), và có thể kích hoạt lại khi B quay lại làm việc hoặc khi kết luận điều tra không có vi phạm.
- **Lợi ích thực tế:** Doanh nghiệp chủ động kiểm soát ai đang thực sự được phép ký chứng chỉ tại từng thời điểm, không phụ thuộc vào việc nhân viên tự giác báo nghỉ.

### 8. Đổi tài khoản nhận tiền quỹ của doanh nghiệp
- **Tình huống:** ABC đổi kế toán phụ trách, cần chuyển tài khoản nhận các khoản tiền phạt thu được từ nhân viên vi phạm sang tài khoản kế toán mới.
- **Diễn biến:** Chủ doanh nghiệp (Giám đốc ABC) thực hiện đổi tài khoản quỹ. Hệ thống từ chối nếu tài khoản mới trùng với người đang giữ quyền chủ doanh nghiệp hoặc trưởng phòng vận hành.
- **Lợi ích thực tế:** Ngăn tình huống người có quyền quản lý/duyệt phạt cũng chính là người hưởng lợi trực tiếp từ khoản tiền phạt đó — giữ tính khách quan của cơ chế xử phạt.

### 9. Xử phạt nặng — tịch thu toàn bộ tiền cọc (vi phạm nghiêm trọng)
- **Tình huống:** Phát hiện giảng viên C cấp chứng chỉ khống cho học viên chưa từng học, gây thiệt hại nghiêm trọng tới uy tín ABC.
- **Diễn biến:** Trưởng phòng vận hành ra quyết định tịch thu **100%** tiền cọc của giảng viên C, chuyển thẳng về tài khoản quỹ của ABC, đồng thời chấm dứt tư cách hoạt động của C ngay lập tức — không cần chờ hoàn tất quy trình kỷ luật nội bộ mới xử lý được phần tài sản đảm bảo.
- **Lợi ích thực tế:** Doanh nghiệp có công cụ chế tài tức thời và dứt khoát cho các vi phạm nghiêm trọng nhất, giảm thiểu thiệt hại lan rộng.

### 10. Xử phạt theo mức độ vi phạm (phạt luỹ tiến, không mất trắng)
- **Tình huống:** Giảng viên D mắc lỗi nhẹ hơn (vd. ghi sai ngày cấp chứng chỉ, phải sửa lại) — chưa tới mức tước toàn bộ tư cách hoạt động.
- **Diễn biến:** ABC đã quy định trước một bảng mức phạt theo từng loại lỗi (vd. lỗi hành chính nhẹ: phạt 1% cọc; lỗi trung bình: phạt 10% cọc; lỗi nghiêm trọng nhưng chưa tới mức hard-slash: phạt 50% cọc). Khi xảy ra vi phạm, trưởng phòng vận hành áp mã lỗi tương ứng, hệ thống tự động trừ đúng phần trăm quy định khỏi tiền cọc của D, chuyển về quỹ ABC.
- **Điểm mấu chốt:** Nếu sau khi bị phạt, tiền cọc còn lại của D thấp hơn mức tối thiểu quy định, D **tự động bị tạm ngưng hoạt động** cho tới khi trưởng phòng vận hành kích hoạt lại và D nạp thêm cọc để đạt lại ngưỡng.
- **Lợi ích thực tế:** ABC có một thang xử phạt linh hoạt tương xứng với mức độ vi phạm, thay vì chỉ có hai lựa chọn cực đoan "không phạt" hoặc "đuổi việc mất trắng cọc".

### 11. Cấu hình mức đặt cọc tối thiểu & thời gian chờ rút cọc
- **Tình huống:** ABC phát triển quy mô lớn hơn, muốn nâng cao độ tin cậy của đội ngũ giảng viên được phép ký chứng chỉ.
- **Diễn biến:** Trưởng phòng vận hành điều chỉnh mức cọc tối thiểu (vd. tăng từ 2 triệu lên 5 triệu đồng quy đổi) và/hoặc kéo dài thời gian chờ rút cọc (vd. từ 1 ngày lên 3 ngày) để tăng an toàn.
- **Điểm mấu chốt:** Thay đổi này **không hồi tố** — giảng viên đang hoạt động với mức cọc cũ không bị buộc nộp thêm ngay lập tức, quy định mới chỉ áp dụng cho người gia nhập sau hoặc các trường hợp so sánh ngưỡng mới (soft-slash, đồng ký).
- **Lợi ích thực tế:** ABC linh hoạt nâng chuẩn theo từng giai đoạn phát triển mà không gây xáo trộn đột ngột cho đội ngũ hiện tại.

### 12. Cấu hình bảng mức phạt theo từng loại vi phạm
- **Tình huống:** ABC muốn quy định rõ ràng, minh bạch trước các mức phạt cho từng loại lỗi thường gặp để nhân viên biết trước hậu quả.
- **Diễn biến:** Trưởng phòng vận hành định nghĩa một danh sách mã lỗi kèm mức phạt tương ứng (tính theo % tiền cọc, từ 0.01% đến 100%), phù hợp với quy chế nội bộ riêng của ABC.
- **Lợi ích thực tế:** Tính minh bạch và có thể dự đoán trước — nhân viên biết rõ hậu quả cụ thể của từng hành vi trước khi vi phạm, giảm tranh cãi "phạt bao nhiêu là hợp lý" sau sự việc.

### 13. Phát hành chứng chỉ số có xác thực
- **Tình huống:** Học viên E hoàn thành khoá học, giảng viên A cần cấp chứng chỉ hoàn thành cho E.
- **Diễn biến:** Ông A "ký" một bản ghi đại diện cho chứng chỉ (gồm mã định danh duy nhất của tài liệu, thông tin học viên E là chủ sở hữu, loại chứng chỉ, phiên bản...) ngay trên thiết bị cá nhân — không cần tự trả phí giao dịch, vì bất kỳ ai (kể cả hệ thống của ABC) cũng có thể gửi hộ chữ ký này lên nền tảng thay ông A.
- **Điểm mấu chốt:** Hệ thống chỉ chấp nhận nếu: đúng là chữ ký của ông A, ông A đang là giảng viên hoạt động hợp lệ của ABC, chứng chỉ với mã này chưa từng được cấp trước đó (chống cấp trùng), và chữ ký chưa quá thời hạn sử dụng đã định (chống chữ ký cũ bị lộ ra ngoài rồi bị lợi dụng cấp muộn).
- **Lợi ích thực tế:** Học viên E nhận một chứng chỉ có thể xác minh công khai vĩnh viễn, nhà tuyển dụng sau này chỉ cần tra cứu mã chứng chỉ là biết ngay thật/giả mà không cần liên hệ lại ABC.

### 14. Thu hồi chứng chỉ sai/gian lận
- **Tình huống:** Sau khi cấp, ABC phát hiện chứng chỉ của học viên E bị cấp sai (nhầm loại khoá học) hoặc phát hiện gian lận trong quá trình học.
- **Diễn biến:** Chủ doanh nghiệp (hoặc chính giảng viên A đã cấp) thực hiện thu hồi hiệu lực chứng chỉ đó.
- **Điểm mấu chốt:** Chứng chỉ **không bị xoá khỏi hệ thống** — vẫn tra cứu được đầy đủ lịch sử, nhưng được đánh dấu rõ "không còn hiệu lực" kèm lý do thu hồi.
- **Lợi ích thực tế:** Vừa xử lý được sai sót/gian lận, vừa giữ được tính minh bạch tuyệt đối — không ai có thể âm thầm xoá dấu vết một chứng chỉ từng tồn tại.

### 15. Yêu cầu nhiều người cùng xác nhận trước khi chứng từ được công nhận đáng tin cậy (đồng ký)
- **Tình huống:** ABC triển khai thêm chứng chỉ "Chuyên gia cao cấp" — loại chứng chỉ có giá trị cao, cần độ tin cậy vượt trội so với chứng chỉ khoá học thông thường.
- **Diễn biến:** Với loại chứng chỉ này, ngoài giảng viên đã cấp ban đầu, ABC yêu cầu thêm 2 giảng viên cấp cao khác cùng xác nhận (đồng ký) thì chứng chỉ mới được coi là đạt độ tin cậy cao nhất — tương tự mô hình "cần 2-3 chữ ký mới hợp lệ" trong giao dịch ngân hàng quan trọng.
- **Lợi ích thực tế:** Các chứng chỉ giá trị cao được bảo vệ bởi nhiều lớp xác nhận độc lập, giảm rủi ro một cá nhân đơn lẻ có thể tự ý cấp khống.

### 16. Thiết lập quy tắc đồng thuận riêng cho từng loại chứng từ
- **Tình huống:** ABC muốn chính sách đồng ký khác nhau tuỳ loại chứng chỉ — chứng chỉ phổ thông không cần đồng ký, chứng chỉ chuyên gia cần đồng ký nghiêm ngặt.
- **Diễn biến:** Trưởng phòng vận hành quy định riêng cho từng loại chứng chỉ: cần tối thiểu bao nhiêu người xác nhận, mức cọc tối thiểu để được tham gia xác nhận loại này, và có bắt buộc đủ các "vai trò chuyên môn" khác nhau hay không — ví dụ chứng chỉ "Chuyên gia cao cấp" bắt buộc phải có cả một giảng viên chuyên môn **và** một người phụ trách kiểm định chất lượng cùng xác nhận, chứ không chỉ cần đủ số lượng người ký bất kỳ.
- **Lợi ích thực tế:** Chính sách đủ linh hoạt để áp cho nhiều cấp độ chứng từ khác nhau trong cùng một doanh nghiệp, không phải "một size cho tất cả".

### 17. Chỉ định ai được quyền tham gia xác nhận + vai trò chuyên môn của họ
- **Tình huống:** ABC cần chỉ rõ giảng viên nào được phép đồng ký chứng chỉ "Chuyên gia cao cấp", và ai trong số đó đóng vai trò "chuyên môn" hay "kiểm định chất lượng".
- **Diễn biến:** Trưởng phòng vận hành thêm/bớt từng giảng viên vào danh sách được phép xác nhận cho loại chứng chỉ cụ thể, kèm gán vai trò chuyên môn tương ứng cho mỗi người.
- **Lợi ích thực tế:** Kiểm soát chính xác ai có quyền gì trên từng loại chứng từ, tránh tình trạng bất kỳ giảng viên nào cũng có thể tự ý đồng ký các chứng chỉ quan trọng.

### 18. Nhân viên chuẩn bị "ví dự phòng" phòng khi mất quyền truy cập
- **Tình huống:** Ông A lo ngại có ngày mất quyền truy cập tài khoản chính (mất thiết bị, quên mật khẩu ví...).
- **Diễn biến:** Ông A chủ động chỉ định trước một tài khoản dự phòng (ví dụ ví của người thân tin cậy, hoặc một ví lưu trữ lạnh do chính ông A cất giữ riêng) để phòng xa.
- **Lợi ích thực tế:** Chuẩn bị trước một "cửa thoát hiểm" cho chính tài sản và uy tín nghề nghiệp của bản thân nhân viên, không phải hoàn toàn phụ thuộc vào thiện chí xử lý của công ty khi sự cố xảy ra.

### 19. Tự khôi phục quyền hoạt động qua ví dự phòng
- **Tình huống:** Ông A thực sự mất quyền truy cập tài khoản chính.
- **Diễn biến:** Người giữ ví dự phòng đã được ông A chỉ định trước có thể tự đứng ra nhận lại toàn bộ tiền cọc, hồ sơ và lịch sử hoạt động của ông A sang tài khoản mới — miễn tài khoản chính của ông A đã ở trạng thái ngưng hoạt động (không thể dùng cách này để "cướp" tài khoản của một giảng viên khác đang hoạt động bình thường).
- **Lợi ích thực tế:** Nhân viên tự chủ hoàn toàn trong việc bảo vệ tài sản của mình mà không cần chờ đợi hay xin phép doanh nghiệp can thiệp.

### 20. Doanh nghiệp khôi phục khẩn cấp khi nhân viên không có ví dự phòng
- **Tình huống:** Giảng viên F mất quyền truy cập tài khoản nhưng trước đó chưa từng chuẩn bị ví dự phòng.
- **Diễn biến:** Trưởng phòng vận hành đứng ra chỉ định một tài khoản mới thay thế cho F, chuyển giao toàn bộ tiền cọc và hồ sơ hoạt động sang tài khoản đó.
- **Lợi ích thực tế:** Đây là "lưới an toàn cuối cùng" đảm bảo tài sản của nhân viên không bị mất vĩnh viễn chỉ vì họ chưa kịp chuẩn bị phương án dự phòng cá nhân.

### 21. Phân quyền rạch ròi, chống một người nắm hết quyền lực
- **Tình huống:** Trong quá trình vận hành, ABC muốn bổ nhiệm thêm người vào các vai trò quản trị.
- **Diễn biến:** Hệ thống tự động kiểm tra và từ chối mọi nỗ lực bổ nhiệm một cá nhân đã đang giữ vai trò chủ doanh nghiệp cũng đồng thời trở thành trưởng phòng vận hành hoặc tài khoản quỹ (và ngược lại), dù thao tác đó vô tình hay cố ý.
- **Lợi ích thực tế:** Bảo vệ ABC khỏi rủi ro nội bộ (một cá nhân vừa duyệt phạt vừa hưởng tiền phạt, vừa quản lý nhân sự vừa nắm quyền tài chính), đồng thời tăng độ tin cậy khi giới thiệu mô hình quản trị này với đối tác, nhà đầu tư hoặc cơ quan quản lý.

### 22. Khách hàng cuối tự tra cứu xác minh chứng chỉ thật/giả
- **Tình huống:** Nhà tuyển dụng G nhận được hồ sơ ứng tuyển của học viên E, muốn xác minh chứng chỉ mà E đính kèm có thật không.
- **Diễn biến:** Nhà tuyển dụng G chỉ cần nhập mã chứng chỉ vào công cụ tra cứu công khai (không cần tài khoản, không cần ví, không mất phí) để biết ngay: chứng chỉ có thật không, còn hiệu lực hay đã bị thu hồi, ai (giảng viên nào của ABC) là người phát hành, đã được bao nhiêu người xác nhận thêm, và đã đạt độ tin cậy cao nhất theo quy định của ABC hay chưa.
- **Lợi ích thực tế:** Đây chính là giá trị cốt lõi mà toàn bộ hệ thống hướng tới — người dùng cuối hoàn toàn không cần hiểu blockchain là gì vẫn được hưởng lợi ích xác minh tức thời, đáng tin cậy.

### 23. Xem danh sách doanh nghiệp / nhân viên đang hoạt động trên hệ thống
- **Tình huống:** Một đối tác tuyển dụng muốn biết ABC có bao nhiêu giảng viên đang được phép cấp chứng chỉ, hoặc đơn vị vận hành nền tảng muốn thống kê số doanh nghiệp đang hoạt động.
- **Diễn biến:** Tra cứu danh sách doanh nghiệp trên toàn nền tảng, hoặc danh sách giảng viên đang hoạt động của riêng ABC, có phân trang để xem với số lượng lớn.
- **Lợi ích thực tế:** Tăng tính minh bạch ở cấp hệ sinh thái, phục vụ các bên thứ ba muốn đánh giá quy mô/uy tín một doanh nghiệp trước khi hợp tác.

### 24. Theo dõi tiến độ xác nhận của một chứng chỉ đang chờ đủ chữ ký
- **Tình huống:** Chứng chỉ "Chuyên gia cao cấp" của học viên E đã được giảng viên A ký, đang chờ đủ 2 người đồng ký nữa mới đạt độ tin cậy cao nhất.
- **Diễn biến:** Bất kỳ ai (ABC, học viên E, hay đối tác) đều tra cứu được: hiện đã có bao nhiêu người xác nhận, còn thiếu bao nhiêu, thiếu vai trò chuyên môn nào.
- **Lợi ích thực tế:** Giúp doanh nghiệp/học viên chủ động đôn đốc các bước xác nhận còn thiếu, thay vì phải hỏi thủ công từng người.

### 25. Truy vết lịch sử khôi phục tài khoản
- **Tình huống:** ABC hoặc kiểm toán nội bộ muốn kiểm tra xem tài khoản hiện tại của giảng viên F có phải là kết quả của một lần khôi phục ví trước đó hay không (liên quan tới sự cố ở mục 19-20).
- **Diễn biến:** Tra cứu để biết tài khoản hiện tại của F có "gốc gác" từ một tài khoản nào đã từng gặp sự cố mất quyền truy cập trong quá khứ.
- **Lợi ích thực tế:** Phục vụ đối soát, điều tra nội bộ, và đảm bảo chuỗi trách nhiệm (ai đã từng ký gì, dưới danh tính nào) không bị đứt gãy qua các lần khôi phục ví.

---

# PHẦN II — CHI TIẾT KỸ THUẬT (Dành cho đội phát triển)

## 1. Kiến trúc tổng quan

```
VoucherProtocol (orchestrator, giữ storage _s + AccessControl + ReentrancyGuard)
   ├── delegatecall → OperatorLib   (vòng đời operator: join/stake/unstake/slash/config)
   ├── delegatecall → DocumentLib   (đăng ký & thu hồi tài liệu, EIP-712 "Register")
   ├── delegatecall → CoSignLib     (đồng ký tài liệu, chính sách co-sign, EIP-712 "CoSign")
   └── delegatecall → RecoveryLib   (khôi phục operator mất ví)

VoucherProtocolReader (contract riêng, immutable ref tới VoucherProtocol)
   └── chỉ đọc state qua các getter public/external của VoucherProtocol, không tốn thêm bytecode ở protocol chính
```

- **Đa tenant (multi-tenant)**: mọi state đều namespace theo `tenantId` (bytes32). Một `fileHash` hay một địa chỉ operator ở tenant A hoàn toàn độc lập với tenant B.
- **3 vai trò cấp tenant**: `admin` (TENANT_ADMIN_ROLE), `operatorManager` (TENANT_OPERATOR_MANAGER_ROLE), `treasury` (không phải role AccessControl, chỉ là địa chỉ nhận tiền).
- **1 vai trò cấp protocol**: `PROTOCOL_ADMIN_ROLE` — không được phép kiêm nhiệm bất kỳ vai trò tenant nào (operator, admin, operatorManager, treasury, recovery delegate...).
- **Chữ ký off-chain EIP-712** dùng cho 2 luồng: đăng ký tài liệu (`Register`) và đồng ký (`CoSign`) — cho phép operator ký ngoài chuỗi, một relayer bất kỳ submit lên chain (meta-transaction pattern).
- **Chống replay**: `nonces[tenantId][signer]` — nonce theo từng tenant, không global.

---

## 2. Actor trong hệ thống

| Actor | Vai trò AccessControl | Mô tả |
|---|---|---|
| **Protocol Owner / Protocol Admin** | `PROTOCOL_ADMIN_ROLE`, `DEFAULT_ADMIN_ROLE` | Deployer ban đầu. Tạo/tắt tenant. Không được tham gia nghiệp vụ tenant (operator, ký tài liệu, treasury...). |
| **Tenant Admin** | `TENANT_ADMIN_ROLE` (dynamic theo tenantId) | Đổi treasury, thu hồi tài liệu (cùng với issuer), là root của role admin trong tenant. |
| **Tenant Operator Manager** | `TENANT_OPERATOR_MANAGER_ROLE` (dynamic theo tenantId) | Quản lý operator: bật/tắt trạng thái, slash/soft-slash, cấu hình stake tối thiểu/cooldown, cấu hình penalty, cấu hình co-sign policy & whitelist, recovery khẩn cấp. |
| **Operator** | không cần role AccessControl, chỉ cần có bản ghi trong `operators[tenantId][addr]` | Stake ETH để tham gia tenant, ký (anchor) tài liệu, đồng ký tài liệu, tự cấu hình recovery delegate. |
| **Treasury** | địa chỉ thường | Nhận ETH từ slash/soft-slash. |
| **Recovery Delegate** | địa chỉ thường (do operator tự chỉ định) | Được quyền tự nhận lại vị trí operator khi operator gốc "mất ví". |
| **Bất kỳ ai (relayer/dApp)** | không cần quyền | Có thể submit `registerWithSignature` / `coSignDocumentWithSignature` thay cho signer (miễn có chữ ký hợp lệ) — mô hình gasless/meta-tx. |

---

## 3. Use case: Quản lý Tenant (Protocol Admin)

### UC-01: Tạo tenant mới — `createTenant`
- **Actor**: Protocol Admin.
- **Input**: `tenantId`, `tenantTreasury`, `config{admin, operatorManager, minStake, unstakeCooldown}`.
- **Điều kiện & xử lý**:
  1. `tenantId != 0`, `admin/operatorManager/tenantTreasury != address(0)`.
  2. Không địa chỉ nào trong (admin, operatorManager, treasury) được trùng nhau (`TenantRoleConflict`).
  3. Không địa chỉ nào trong 3 vai trò được đang giữ `PROTOCOL_ADMIN_ROLE` (`ProtocolAdminCannotHaveOtherRoles`).
  4. `minStake > 0`, `unstakeCooldown > 0`.
  5. `tenantId` chưa tồn tại (`TenantAlreadyExists`).
  6. Ghi `Tenant{admin, operatorManager, treasury, isActive:true, createdAt}` + push vào `tenantList`.
  7. Sinh 2 role động: `TENANT_ADMIN_ROLE(tenantId)` và `TENANT_OPERATOR_MANAGER_ROLE(tenantId)`, gán role-admin cho chính `tenantAdminRole` (tự trị — protocol admin không kiểm soát role tenant sau khi tạo).
  8. Cấp role tương ứng cho `admin`/`operatorManager`.
  9. Ghi `minStake`, `unstakeCooldown` mặc định cho tenant.
- **Event**: `TenantCreated`, `TenantStatusUpdated(true)`, `MinOperatorStakeUpdated`, `UnstakeCooldownUpdated`.
- **Edge case**: mỗi tenant hoàn toàn cô lập role — admin tenant A không có quyền gì ở tenant B vì role được băm theo `tenantId`.

### UC-02: Bật/tắt tenant — `setTenantStatus`
- **Actor**: Protocol Admin.
- **Xử lý**: `TenantNotFound` nếu chưa tồn tại; set `isActive`.
- **Tác động domino khi tắt tenant** (rất quan trọng): tenant `isActive=false` sẽ chặn:
  - `joinAsOperator`, `topUpStake`, `updateOperatorMetadata`, `requestUnstake` — **đều check `isActive`** ⇒ operator cũ **không unstake được** khi tenant bị vô hiệu hoá (đứng hình quỹ)... 
  - **Ngoại lệ**: `executeUnstake` **không check `isActive`** (chỉ check `TenantNotFound`) ⇒ nếu đã request trước khi tenant bị tắt, operator vẫn rút được sau cooldown.
  - `registerWithSignature`, `coSignDocumentWithSignature` — đều check `isActive` ⇒ tenant tắt thì không anchor/co-sign tài liệu mới được, nhưng tài liệu cũ vẫn `verify` được (Reader không check isActive).
  - `setOperatorStatus`, `slashOperator`, `softSlashOperator`, `revokeDocument`, các hàm config (`setMinOperatorStake`,...), recovery — **không check tenant `isActive`** ⇒ operatorManager/admin vẫn quản trị được ngay cả khi tenant đang bị khoá (chủ đích: cho phép dọn dẹp/slash trong lúc tenant tạm ngưng).

---

## 4. Use case: Vòng đời Operator (`OperatorLib`)

### UC-03: Gia nhập operator — `joinAsOperator`
- **Actor**: bất kỳ ví nào (trừ Protocol Admin).
- **Điều kiện**: not Protocol Admin; tenant tồn tại & active; `msg.value >= tenantMinOperatorStake[tenantId]`; chưa có stake/active trước đó (không cho join đè).
- **Kết quả**: ghi `Operator{tenantId, walletAddress, metadataURI, stakeAmount=msg.value, isActive:true}`, thêm vào `operatorList` (idempotent qua `isOperatorListed`), reset `pendingUnstakeAt=0`.
- **Event**: `OperatorJoined`, `OperatorStatusUpdated(true,"JOINED")`.
- **Lỗi**: `ProtocolAdminCannotHaveOtherRoles`, `TenantNotFound`, `TenantInactive`, `InsufficientStake`, `OperatorAlreadyActive`.

### UC-04: Nạp thêm stake — `topUpStake`
- **Điều kiện**: tenant active; operator đã tồn tại (`stakeAmount != 0`) và đang active; `msg.value > 0`.
- **Kết quả**: cộng dồn `stakeAmount`. **Lưu ý**: operator bị soft-slash xuống dưới min stake (isActive=false) **không top-up được** cho tới khi được kích hoạt lại bởi operatorManager (`setOperatorStatus`) — vì check `isActive` chặn trước.

### UC-05: Cập nhật hồ sơ — `updateOperatorMetadata`
- **Điều kiện**: tenant active, operator active. Không giới hạn tần suất.

### UC-06: Yêu cầu rút stake — `requestUnstake`
- **Điều kiện**: tenant active, operator active, `stakeAmount > 0`.
- **Kết quả**: `pendingUnstakeAt = now + tenantUnstakeCooldown[tenantId]`.
- **Edge case**: request nhiều lần sẽ **ghi đè** mốc thời gian mới (không cộng dồn) — mỗi lần gọi lại reset lại đồng hồ cooldown.

### UC-07: Thực thi rút stake — `executeUnstake` (nonReentrant)
- **Điều kiện**: `pendingUnstakeAt != 0`, `block.timestamp >= readyAt`, `stakeAmount > 0`. **Không** check tenant `isActive` (chỉ check tồn tại) — cho phép rút ngay cả khi tenant đã bị khoá.
- **Kết quả (CEI pattern)**: set `stakeAmount=0`, `isActive=false`, `pendingUnstakeAt=0` **trước khi** chuyển ETH bằng low-level `call`; nếu chuyển thất bại → revert toàn bộ (`EthTransferFailed`).
- **Event**: `OperatorUnstaked`, `OperatorStatusUpdated(false,"UNSTAKED")`.
- **Edge case an ninh**: một operator manager có thể `slashOperator`/`softSlashOperator` operator này trong lúc đang chờ cooldown — vì các hàm slash không check `pendingUnstakeAt`, chúng set thẳng `stakeAmount=0` và `pendingUnstakeAt=0`, khiến `executeUnstake` sau đó revert với `NoPendingUnstake`/`NoStake` (do đã bị dọn trước) — tức slash "thắng" trước unstake nếu được gọi trước khi cooldown hết hạn.

### UC-08: Operator Manager quản lý trạng thái — `setOperatorStatus`
- **Actor**: `operatorManager` role của tenant.
- **Điều kiện**: operator có `stakeAmount != 0` (đã từng join, kể cả đang inactive do soft-slash).
- **Kết quả**: set `isActive`; nếu chuyển sang inactive thì reset `pendingUnstakeAt=0` (huỷ mọi yêu cầu unstake đang chờ).
- **Use case thực tế**: dùng để "mở khoá" operator sau khi soft-slash đưa họ xuống dưới min stake và họ đã `topUpStake` lại đủ ngưỡng (nhưng chú ý: `topUpStake` bị chặn khi `isActive=false`, nên **thứ tự đúng phải là**: operatorManager set `isActive=true` trước, operator mới `topUpStake` được — đây là một ràng buộc quy trình cần lưu ý khi thiết kế UI/SDK).

### UC-09: Đổi treasury — `setTreasury`
- **Actor**: `admin` role của tenant.
- **Điều kiện**: `newTreasury != 0`; không phải Protocol Admin; không được trùng với địa chỉ đang giữ `TENANT_ADMIN_ROLE` hoặc `TENANT_OPERATOR_MANAGER_ROLE` của tenant đó (`TenantRoleConflict`) — đảm bảo tách bạch quyền lực khỏi dòng tiền phạt.

### UC-10: Hard slash — `slashOperator` (nonReentrant)
- **Actor**: `operatorManager`.
- **Kết quả**: tịch thu 100% `stakeAmount` chuyển thẳng về `treasury` của tenant; set `isActive=false`; xoá `pendingUnstakeAt` và `recoveryDelegates`.
- **Edge case**: operatorManager có thể tự đóng vai kẻ vi phạm cũng bị slash (không có check `msg.sender != operator` như `softSlashOperator` — hard slash **không** chặn tự-slash chính mình).

### UC-11: Soft slash theo violation code — `softSlashOperator` (nonReentrant)
- **Actor**: `operatorManager`, **không được** tự slash chính mình (`CannotSlashYourself`).
- **Điều kiện**: operator có stake > 0; `tenantViolationPenalties[tenantId][violationCode] != 0` (phải cấu hình trước qua `setViolationPenalty`, nếu chưa cấu hình → `PenaltyNotConfigured`).
- **Công thức phạt**: `slashAmount = stake * penaltyBps / 10000`; nếu làm tròn về 0 thì ép tối thiểu = 1 wei (tránh phạt "vô hại").
- **Kết quả phụ**: nếu `remaining < tenantMinOperatorStake` → tự động set `isActive=false` và xoá recovery delegate (operator "rơi khỏi ngưỡng" bị coi như ngưng hoạt động, phải được operatorManager kích hoạt lại + top-up).
- **Event**: `OperatorSoftSlashed` (đầy đủ before/after), có thể kèm `OperatorStatusUpdated(false,"SOFT_SLASHED_BELOW_MIN_STAKE")`.

### UC-12/13: Cấu hình `setMinOperatorStake` / `setUnstakeCooldown`
- **Actor**: `operatorManager`. Giá trị mới phải `> 0`. Thay đổi này **không hồi tố** — operator đang active với stake thấp hơn ngưỡng mới vẫn giữ nguyên trạng thái (chỉ áp dụng cho `joinAsOperator` mới hoặc so sánh min-stake trong soft-slash/co-sign).

### UC-14: Cấu hình mức phạt — `setViolationPenalty`
- **Actor**: `operatorManager`. `violationCode != 0`; `1 <= penaltyBps <= 10000` (0.01% → 100%).

---

## 5. Use case: Vòng đời tài liệu (`DocumentLib`)

### UC-15: Anchor tài liệu bằng chữ ký — `registerWithSignature` (nonReentrant)
- **Actor**: bất kỳ ai submit transaction (relayer), nhưng chữ ký phải của một operator hợp lệ trong tenant.
- **Payload EIP-712** (`Register` typehash): `tenantId, fileHash, owner, cid, ciphertextHash, encryptionMetaHash, docType, version, nonce, deadline`.
- **Điều kiện**:
  1. Tenant tồn tại & active.
  2. `block.timestamp <= deadline` (nếu quá hạn → `ExpiredSignature`).
  3. `fileHash` chưa từng đăng ký trong tenant này (`DocumentAlreadyExists` — chống anchor đè).
  4. Recover `signer` từ chữ ký; signer không được là Protocol Admin.
  5. Signer phải là operator có stake và đang active trong tenant.
  6. `nonces[tenantId][signer] == payload.nonce` (khớp tuyệt đối, chống replay/out-of-order).
- **Kết quả**: ghi `Document{tenantId, cid, owner, issuer=signer, timestamp, isValid:true, ciphertextHash, encryptionMetaHash, docType, version}`; đánh dấu `documentSigners[...][signer]=true`; `coSignCount=1`; tăng `nonces[signer]+=1`.
- **Đánh giá co-sign ngay từ lúc anchor**: nếu policy của `docType` **chưa bật** → tài liệu **qualified ngay lập tức**. Nếu **đã bật** và issuer đồng thời nằm trong whitelist + đủ stake + có role hợp lệ → issuer được tính luôn là 1 trusted signer đầu tiên, và có thể qualify ngay nếu đạt quorum với đúng 1 người ký.
- **Event**: `NonceConsumed`, `DocumentAnchored`, `DocumentCoSigned(...,1)`, có thể thêm `DocumentCoSignQualified`.
- **Use case nghiệp vụ**: `owner` (chủ sở hữu tài liệu) và `issuer` (operator ký) là 2 vai trò tách biệt — cho phép mô hình "operator thay mặt khách hàng anchor tài liệu".

### UC-16: Thu hồi tài liệu — `revokeDocument`
- **Actor**: `admin` role của tenant **hoặc** chính `issuer` gốc.
- **Điều kiện**: tài liệu tồn tại, chưa bị revoke trước đó (`DocumentAlreadyRevoked`).
- **Kết quả**: `isValid=false` (giữ nguyên toàn bộ dữ liệu — không xoá, phục vụ audit trail).
- **Edge case**: sau khi bị recovery (`recoverOperatorByDelegate`/`recoverOperatorByAdmin`), `issuer` field trên document **vẫn là địa chỉ ví cũ** (không migrate) → chỉ tenant `admin` mới revoke được tài liệu do operator đã bị mất ví phát hành, vì ví cũ không còn tồn tại trong `operators` mapping nhưng vẫn hợp lệ để so sánh `msg.sender == doc.issuer` (về lý thuyết ví cũ vẫn có thể tự revoke tài liệu của chính nó nếu vẫn giữ được private key — recovery không thu hồi quyền ký cũ, chỉ chuyển stake).

---

## 6. Use case: Đồng ký tài liệu & Chính sách Co-Sign (`CoSignLib`)

### UC-17: Đồng ký — `coSignDocumentWithSignature` (nonReentrant)
- **Payload EIP-712** (`CoSign` typehash): `tenantId, fileHash, nonce, deadline`.
- **Điều kiện**:
  1. Tenant tồn tại & active; chữ ký chưa hết hạn.
  2. Tài liệu tồn tại và `isValid=true` (tài liệu đã revoke thì không co-sign được — `DocumentNotValid`).
  3. Signer không phải Protocol Admin; là operator có stake & active; nonce khớp; **chưa từng ký tài liệu này** (`AlreadyCoSigned`).
  4. Nếu policy của `docType` (đọc từ `doc.docType` đã lưu lúc anchor) đang **bật** → `_enforceCoSignPolicy`: signer phải nằm trong whitelist theo `docType`, đủ `minStake`, và có `roleId` hợp lệ (1–256) — nếu không đạt bất kỳ điều kiện nào → revert tương ứng (`CoSignerNotWhitelisted`, `InsufficientCoSignStake`, `InvalidCoSignRole`).
- **Kết quả**: `documentSigners=true`; `coSignCount+=1`; nonce+=1; nếu policy bật thì `trustedCoSignCount+=1` và `trustedCoSignRoleMask |= roleMask(roleId)`, sau đó đánh giá lại qualification.
- **Điều kiện qualify (`_evaluateCoSignQualification`)**: đã qualified thì bỏ qua (idempotent, không emit lại); nếu policy tắt → luôn qualified; nếu bật → cần **đồng thời** `trustedCoSignCount >= minSigners` **và** `(trustedCoSignRoleMask & requiredRoleMask) == requiredRoleMask` (tất cả role bắt buộc trong mask phải có ít nhất 1 người đại diện — không chỉ đếm số lượng mà còn đòi hỏi đa dạng vai trò).
- **Event**: `NonceConsumed`, `DocumentCoSigned`, (khi đạt quorum lần đầu) `DocumentCoSignQualified`.

### UC-18: Cấu hình chính sách co-sign — `setCoSignPolicy`
- **Actor**: `operatorManager`.
- **Điều kiện**: nếu `enabled=true` thì phải có ít nhất `minSigners > 0` **hoặc** `requiredRoleMask != 0` (không cho bật policy vô nghĩa — `InvalidCoSignPolicy`).
- **Lưu ý vận hành**: đổi policy **không ảnh hưởng hồi tố** tới tài liệu đã `coSignQualified=true` từ trước (biến này chỉ được set một chiều, không bao giờ reset về false).

### UC-19: Cấu hình whitelist + role operator theo docType — `setCoSignOperator`
- **Actor**: `operatorManager`. `operator != 0`.
- **Khi `whitelisted=true`**: `roleId` phải trong khoảng `[1,256]` (`InvalidCoSignRole`); operator không được là Protocol Admin.
- **Khi `whitelisted=false`**: reset `roleId=COSIGN_ROLE_NONE(0)` — gỡ whitelist đồng thời xoá luôn role đã gán.
- **Cơ chế roleMask**: `roleId` được chuyển thành bitmask `1 << (roleId-1)` (dùng `uint256`, tối đa 256 role riêng biệt mỗi docType) — cho phép policy yêu cầu tổ hợp nhiều "loại vai trò" (vd: phải có ít nhất 1 kế toán + 1 pháp lý) cùng ký mới coi là đủ điều kiện.

---

## 7. Use case: Khôi phục Operator mất ví (`RecoveryLib`)

### UC-20: Tự đăng ký delegate dự phòng — `setRecoveryDelegate`
- **Actor**: operator đang active.
- **Điều kiện**: `delegate != 0`, `delegate != msg.sender`, delegate không phải Protocol Admin.
- **Use case**: chuẩn bị trước một ví dự phòng (vd ví cold-wallet/gia đình) để tự cứu tài sản nếu mất private key ví operator.

### UC-21: Delegate tự nhận lại quyền operator — `recoverOperatorByDelegate`
- **Actor**: chính delegate đã được chỉ định trước.
- **Điều kiện**:
  1. `msg.sender` không phải Protocol Admin.
  2. Operator cũ (`lostOperator`) phải **inactive** (`OperatorNotLost` nếu vẫn active — tức chủ sở hữu phải tự set inactive hoặc bị operatorManager khoá trước, đảm bảo không recovery "cướp" một operator vẫn đang hoạt động bình thường).
  3. Operator cũ còn stake (`NoStakeToRecover`).
  4. Không đang trong tiến trình unstake (`pendingUnstakeAt > 0` → `UnstakeInProgress` — tránh xung đột giữa 2 luồng rút tiền).
  5. `recoveryDelegates[tenantId][lostOperator] == msg.sender` (đúng người được uỷ quyền — `RecoveryNotAllowed`).
  6. Ví đích (`msg.sender`) chưa từng có stake/active từ trước (`InvalidRecoveryTarget` — tránh ghi đè dữ liệu operator khác).
- **Kết quả**: toàn bộ `metadataURI, stakeAmount, isActive, nonce` được **migrate nguyên vẹn** sang ví mới; ví cũ bị `delete` sạch (operator, nonce, pendingUnstake, recoveryDelegate). Ghi lại **alias chuỗi** (`recoveredFrom`/`recoveredTo`) để truy vết toàn bộ lịch sử ví gốc → ví hiện tại, kể cả recovery nhiều lần liên tiếp (root operator luôn trỏ về ví đầu tiên trong chuỗi).
- **Event**: `OperatorRecovered`, `OperatorRecoveryAliasUpdated`, `OperatorRecoveryDelegateUpdated(...,address(0))` (xoá delegate cũ, ví mới phải tự cấu hình lại delegate nếu muốn).

### UC-22: Governance khôi phục khẩn cấp — `recoverOperatorByAdmin`
- **Actor**: `operatorManager` của tenant (dùng khi operator không có delegate hoặc delegate cũng mất quyền truy cập).
- **Điều kiện tương tự UC-21** nhưng không cần `recoveryDelegates` khớp, thay vào đó `operatorManager` toàn quyền chỉ định `newOperator` bất kỳ (không phải Protocol Admin, không trùng `lostOperator`, chưa có dữ liệu operator trước đó).
- **Khác biệt quan trọng**: **không check `pendingUnstakeAt`** như UC-21 — governance có thể recovery ngay cả khi operator cũ đang chờ unstake (rủi ro cần lưu ý: nếu vừa recovery xong, `pendingUnstakeAt` được reset về 0 cho ví mới, huỷ luôn yêu cầu rút tiền cũ).

---

## 8. Use case: Phân quyền & Chống xung đột vai trò

### UC-23: Cấp role có kiểm soát — `grantRole` (override)
- Override toàn cục của AccessControl: mọi lần cấp role phải qua `_enforceTenantRoleSegregationOnGrant`.
- Nếu role là `TENANT_ADMIN_ROLE` của tenant X: người được cấp không được đồng thời là `operatorManager` hoặc `treasury` của X, và không được là Protocol Admin.
- Nếu role là `TENANT_OPERATOR_MANAGER_ROLE` của tenant X: người được cấp không được đồng thời là `admin` hoặc `treasury` của X, và không được là Protocol Admin.
- **Mục tiêu bảo mật**: đảm bảo tách bạch 3 quyền lực (admin / operator-manager / treasury) trong cùng 1 tenant — không một cá nhân nào gom đủ 2-3 vai trò để tự chuyển tiền + tự duyệt + tự quản trị.
- **Giới hạn đã biết**: kiểm tra chỉ áp dụng khi role được cấp **qua `grantRole`**; việc gán `treasury` qua `setTreasury` (UC-09) đã tự kiểm tra xung đột riêng ở chiều ngược lại, nên 2 cơ chế bổ trợ nhau bao phủ đủ 2 chiều gán.

---

## 9. Use case: Tra cứu (Read-only) — `VoucherProtocolReader`

| Hàm | Mục đích | Use case |
|---|---|---|
| `verify` | Kiểm tra nhanh tài liệu có tồn tại + hợp lệ không | dApp/khách hàng xác minh 1 văn bằng/chứng từ trước khi tin dùng |
| `getDocumentOrRevert` | Lấy full metadata, revert nếu không có | Backend cần fail-fast khi tra cứu tài liệu không tồn tại |
| `hasSignedDocument` | Ai đó đã ký tài liệu chưa | Kiểm tra tiến trình đồng ký của 1 địa chỉ cụ thể |
| `isDocumentCoSignQualified` / `getCoSignStatus` | Trạng thái quorum co-sign | Hiển thị tiến độ "đã đủ chữ ký tin cậy chưa" trên UI |
| `getTenantIds` / `getTenantInfo` / `getTenantCount` | Danh sách & thông tin tenant (phân trang) | Trang quản trị liệt kê toàn bộ tenant |
| `getOperatorIds` / `getOperatorCount` / `getOperatorStatus` | Danh sách & trạng thái operator (phân trang) | Dashboard vận hành xem toàn bộ operator + stake + cooldown unstake còn lại (`canUnstakeNow`) |
| `getDocumentStatus` | Snapshot đầy đủ 1 tài liệu + trạng thái co-sign | Trang chi tiết tài liệu |
| `getCoSignPolicy` / `getCoSignOperatorConfig` | Đọc chính sách/whitelist hiện hành | UI cấu hình cho operatorManager |
| `getTenantRuntimeConfig` / `getViolationPenalty` | Đọc config runtime | Hiển thị min-stake, cooldown, bảng phạt |
| `getRecoveryAliasStatus` | Có lịch sử recovery không, root operator là ai | Truy vết một ví hiện tại có phải "hậu duệ" của ví nào đã bị mất |

- Toàn bộ Reader **không throw khi tài liệu/tenant/operator chưa tồn tại** ở phần lớn hàm (trả `exists=false`), trừ `getDocumentOrRevert` (chủ đích revert) và `getCoSignStatus` (revert nếu document không tồn tại vì cần đọc `docType` để lấy policy).

---

## 10. Bảng lỗi (errors) tổng hợp theo nhóm nghiệp vụ

| Nhóm | Errors liên quan |
|---|---|
| Tenant | `TenantNotFound`, `TenantAlreadyExists`, `TenantInactive`, `InvalidTenantAddress`, `TenantRoleConflict` |
| Operator lifecycle | `InsufficientStake`, `OperatorNotActive`, `OperatorAlreadyActive`, `OperatorNotInTenant`, `NoStake`, `NoPendingUnstake`, `UnstakeNotReady`, `EthTransferFailed` |
| Document | `DocumentAlreadyExists`, `DocumentNotFound`, `DocumentAlreadyRevoked`, `DocumentNotValid` |
| Chữ ký / EIP-712 | `InvalidSignature`, `ExpiredSignature` |
| Recovery | `InvalidRecoveryTarget`, `RecoveryNotAllowed`, `NoStakeToRecover`, `UnstakeInProgress`, `OperatorNotLost` |
| Co-sign | `AlreadyCoSigned`, `InvalidCoSignPolicy`, `CoSignerNotWhitelisted`, `InsufficientCoSignStake`, `InvalidCoSignRole` |
| Slashing | `InvalidPenaltyBps`, `PenaltyNotConfigured`, `CannotSlashYourself` |
| Phân quyền chéo tenant/protocol | `Unauthorized`, `ProtocolAdminCannotHaveOtherRoles`, `InvalidOperatorAddress`, `InvalidConfigValue` |

---

## 11. Các bất biến bảo mật (invariants) xuyên suốt hệ thống

1. **Cách ly Protocol Admin**: mọi luồng nghiệp vụ tenant (`joinAsOperator`, `registerWithSignature`, `coSignDocumentWithSignature`, `setTreasury`, `setRecoveryDelegate`, `recoverOperatorByDelegate/ByAdmin`, `setCoSignOperator`) đều chặn địa chỉ đang giữ `PROTOCOL_ADMIN_ROLE` — tách bạch quyền quản trị hệ thống khỏi quyền lợi kinh tế trong tenant.
2. **Chống replay chữ ký**: nonce theo tenant + theo signer, tăng dần bắt buộc khớp tuyệt đối (không cho phép "nhảy cóc" nonce).
3. **Chống reentrancy**: mọi hàm có chuyển ETH (`executeUnstake`, `slashOperator`, `softSlashOperator`) đều `nonReentrant`; `registerWithSignature`/`coSignDocumentWithSignature` cũng `nonReentrant` dù không chuyển tiền (phòng vệ cho các hook tương lai / gọi lồng nhau qua delegatecall).
4. **CEI pattern**: state luôn được cập nhật (zero-out) trước khi gọi `.call{value}` chuyển ETH.
5. **Audit trail bất biến**: không có thao tác nào xoá hẳn `Document` — chỉ đổi cờ `isValid`; toàn bộ thay đổi quan trọng đều có event tương ứng để index off-chain (subgraph).
6. **Namespace tenant tuyệt đối**: mọi mapping cốt lõi đều keyed theo `tenantId` trước, không có state "global" nào rò rỉ giữa các tenant (trừ `PROTOCOL_ADMIN_ROLE` và danh sách `tenantList` ở tầng protocol).
7. **Role tenant tự trị sau khi tạo**: `_setRoleAdmin(tenantAdminRole, tenantAdminRole)` khiến Protocol Admin **không thể** tự ý cấp/thu hồi role admin của một tenant sau khi đã tạo (chỉ chính tenant admin mới quản được role của mình) — giảm rủi ro protocol admin lạm quyền can thiệp nội bộ tenant.

---

## 12. Một số kịch bản kết hợp (end-to-end) đáng chú ý

**A. Vòng đời "operator lên chức đồng ký tin cậy" (co-sign quorum)**
1. `operatorManager` gọi `setCoSignPolicy(tenantId, docType, enabled=true, minStake, minSigners, requiredRoleMask)`.
2. `operatorManager` gọi `setCoSignOperator` whitelist từng operator kèm `roleId` tương ứng (vd role 1 = "Kế toán", role 2 = "Pháp lý").
3. Operator issuer `registerWithSignature` — nếu bản thân đã whitelist + đủ stake, được tính trusted signer đầu tiên.
4. Các operator khác lần lượt `coSignDocumentWithSignature` — mỗi lần hợp lệ sẽ cộng dồn `trustedCoSignRoleMask`.
5. Khi `trustedCoSignCount >= minSigners` **và** đủ tổ hợp role bắt buộc → `coSignQualified=true` (một chiều, không đảo ngược) + emit `DocumentCoSignQualified`.

**B. Vòng đời "mất ví → khôi phục → tiếp tục ký"**
1. Operator gốc từng gọi `setRecoveryDelegate(tenantId, delegateAddr)` khi còn kiểm soát ví.
2. Ví operator gốc bị mất/khoá (`operatorManager` gọi `setOperatorStatus(isActive=false)` hoặc chính họ tự đưa về inactive trước khi mất quyền truy cập).
3. Delegate gọi `recoverOperatorByDelegate` → nhận toàn bộ stake + nonce, ví mới có thể tiếp tục `registerWithSignature`/`coSignDocumentWithSignature` ngay (do nonce được kế thừa, không bị lệch).
4. Nếu delegate cũng không dùng được / chưa từng cấu hình → `operatorManager` phải can thiệp bằng `recoverOperatorByAdmin`.

**C. Vòng đời "vi phạm nhẹ nhiều lần → mất quyền hoạt động"**
1. `operatorManager` cấu hình `setViolationPenalty(tenantId, code, bps)` cho từng loại lỗi.
2. Mỗi lần vi phạm, `softSlashOperator` trừ dần stake theo `bps`.
3. Khi stake còn lại < `tenantMinOperatorStake` → tự động `isActive=false`, xoá recovery delegate.
4. Operator muốn hoạt động lại: `operatorManager` phải chủ động `setOperatorStatus(isActive=true)` **trước**, sau đó operator mới `topUpStake` được để đạt lại ngưỡng tối thiểu (thứ tự bắt buộc do ràng buộc code, xem UC-08).
