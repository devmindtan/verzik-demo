let DATA = null;
const TODAY = '21/07/2026';
const MY_TENANT_ID = 'abc';

const roleConfig = {
    'public': { title: '<i class="fa-solid fa-earth-americas text-slate-400"></i> Dịch Vụ Công Cộng', defaultView: 'my-docs' },
    'operator': { title: '<i class="fa-solid fa-user-tie text-blue-400"></i> Portal Nhân Viên', defaultView: 'issue' },
    'tenant': { title: '<i class="fa-solid fa-building-shield text-amber-400"></i> Admin Doanh Nghiệp', defaultView: 'hr' },
    'admin': { title: '<i class="fa-solid fa-server text-purple-400"></i> Admin Nền Tảng', defaultView: 'platform' }
};

const viewIds = ['verify', 'my-docs', 'explorer', 'issue', 'cosign', 'slash', 'recovery', 'revoke', 'platform', 'stake', 'config', 'hr', 'security', 'treasury', 'emergency-recovery'];
const viewBgClass = { revoke: 'bg-amber-500', treasury: 'bg-amber-500', platform: 'bg-purple-600', explorer: 'bg-emerald-600' };
const viewIconIdleClass = { revoke: 'text-amber-500', treasury: 'text-amber-500', platform: 'text-purple-500', stake: 'text-blue-400', security: 'text-indigo-400', recovery: 'text-amber-500', slash: 'text-red-400', config: 'text-emerald-400', explorer: 'text-emerald-400', 'emergency-recovery': 'text-amber-500' };

const renderers = {
    'my-docs': renderMyDocs, verify: resetVerify, explorer: renderExplorer, issue: renderIssue,
    cosign: renderCosign, stake: renderStake, security: renderSecurity, recovery: renderRecovery,
    hr: renderHr, slash: renderSlash, config: renderConfig, revoke: renderRevoke,
    platform: renderPlatform, treasury: renderTreasury, 'emergency-recovery': renderEmergencyRecovery
};

async function init() {
    DATA = await fetch('data.json').then(r => r.json());
    switchRole('public');
}

function me() { return DATA.operators.find(o => o.id === DATA.currentUser.operatorId); }
function myTenant() { return DATA.tenants.find(t => t.id === MY_TENANT_ID); }
function fmtEth(n) { return Number(n).toFixed(2); }
function roleLabel(roleId) { return DATA.roleCatalog.find(r => r.roleId === roleId)?.label || `Role ${roleId}`; }
function policyFor(docType) { return DATA.coSignPolicies.find(p => p.docType === docType); }
function whitelistEntry(docType, operatorId) { return DATA.coSignWhitelist.find(w => w.docType === docType && w.operatorId === operatorId); }

// Policy is re-read live on every check (not frozen at anchor time) — matches
// CoSignLib._evaluateCoSignQualification, which only freezes `qualified` itself.
function isDocQualified(doc) {
    if (doc.coSign.qualified) return true;
    const policy = policyFor(doc.docType);
    if (!policy || !policy.enabled) { doc.coSign.qualified = true; return true; }
    const meetsCount = doc.coSign.trustedCount >= policy.minSigners;
    const meetsRoles = policy.requiredRoleIds.every(r => doc.coSign.trustedRoleIds.includes(r));
    if (meetsCount && meetsRoles) doc.coSign.qualified = true;
    return doc.coSign.qualified;
}
function missingRequiredRoles(doc) {
    const policy = policyFor(doc.docType);
    if (!policy || !policy.enabled) return [];
    return policy.requiredRoleIds.filter(r => !doc.coSign.trustedRoleIds.includes(r));
}

// ================= IPFS CONTENT VIEWER =================
let ipfsViewerDocId = null;
let ipfsViewerPage = 0;

function openIpfsViewer(docId) {
    const doc = DATA.documents.find(d => d.id === docId);
    if (!doc || !doc.content) { showToast("Lỗi", "Tài liệu này chưa có nội dung IPFS trong dữ liệu demo.", "red"); return; }
    ipfsViewerDocId = docId;
    ipfsViewerPage = 0;
    renderIpfsViewer();
    document.getElementById('ipfs-viewer-modal').classList.remove('hidden');
}

function closeIpfsViewer() {
    document.getElementById('ipfs-viewer-modal').classList.add('hidden');
    ipfsViewerDocId = null;
}

function renderIpfsViewer() {
    const doc = DATA.documents.find(d => d.id === ipfsViewerDocId);
    if (!doc) return;
    const pages = doc.content.pages;
    const page = pages[ipfsViewerPage];
    document.getElementById('ipfs-viewer-title').innerText = doc.title;
    document.getElementById('ipfs-viewer-cid').innerText = doc.cid;
    document.getElementById('ipfs-viewer-gateway-link').href = `https://ipfs.io/ipfs/${doc.cid}`;
    document.getElementById('ipfs-viewer-page-heading').innerText = page.heading;
    document.getElementById('ipfs-viewer-page-body').innerText = page.body;
    document.getElementById('ipfs-viewer-page-indicator').innerText = `Trang ${ipfsViewerPage + 1}/${pages.length}`;
    document.getElementById('ipfs-viewer-prev').disabled = ipfsViewerPage === 0;
    document.getElementById('ipfs-viewer-next').disabled = ipfsViewerPage === pages.length - 1;
}

function ipfsPrevPage() {
    if (ipfsViewerPage > 0) { ipfsViewerPage -= 1; renderIpfsViewer(); }
}

function ipfsNextPage() {
    const doc = DATA.documents.find(d => d.id === ipfsViewerDocId);
    if (doc && ipfsViewerPage < doc.content.pages.length - 1) { ipfsViewerPage += 1; renderIpfsViewer(); }
}

function switchRole(roleId) {
    ['public', 'operator', 'tenant', 'admin'].forEach(r => {
        const btn = document.getElementById(`role-${r}`);
        if (r === roleId) {
            btn.className = `px-4 py-1.5 rounded-md text-sm font-bold transition-all shadow text-white ${r === 'public' ? 'bg-slate-800' : (r === 'operator' ? 'bg-blue-600' : (r === 'tenant' ? 'bg-amber-600' : 'bg-purple-600'))}`;
            btn.querySelector('i').classList.remove('text-slate-300', 'text-blue-600', 'text-amber-600', 'text-purple-600');
            btn.querySelector('i').classList.add('text-white', 'mr-1');
        } else {
            btn.className = `px-4 py-1.5 rounded-md text-sm font-medium transition-all text-slate-600 hover:text-${r === 'operator' ? 'blue' : (r === 'tenant' ? 'amber' : 'purple')}-600`;
            btn.querySelector('i').className = `fa-solid ${r === 'public' ? 'fa-earth-americas text-slate-400' : (r === 'operator' ? 'fa-user-tie' : (r === 'tenant' ? 'fa-building-shield' : 'fa-server'))} mr-1`;
        }
    });

    document.getElementById('sidebar-role-title').innerHTML = roleConfig[roleId].title;

    ['public', 'operator', 'tenant', 'admin'].forEach(r => document.getElementById(`menu-group-${r}`).classList.add('hidden'));
    document.getElementById(`menu-group-${roleId}`).classList.remove('hidden');

    switchView(roleConfig[roleId].defaultView);
}

function switchView(viewId) {
    viewIds.forEach(id => {
        const btn = document.getElementById(`nav-${id}`);
        const isSelected = id === viewId;
        const section = document.getElementById(`view-${id}`);
        if (section) section.classList.add('hidden');
        if (!btn) return;

        if (isSelected) {
            const bgClass = viewBgClass[id] || 'bg-blue-600';
            btn.className = `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${bgClass} text-white`;
            const icon = btn.querySelector('i');
            icon.classList.remove(...Object.values(viewIconIdleClass));
            icon.classList.add('text-white');
        } else {
            btn.className = `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-slate-300 hover:bg-slate-800`;
            const icon = btn.querySelector('i');
            icon.classList.remove('text-white');
            if (viewIconIdleClass[id]) icon.classList.add(viewIconIdleClass[id]);
        }
    });
    const activeSection = document.getElementById(`view-${viewId}`);
    if (activeSection) activeSection.classList.remove('hidden');
    renderers[viewId]?.();
}

function showToast(title, message, color = "emerald") {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    icon.className = `w-8 h-8 rounded-full flex items-center justify-center text-white bg-${color}-500`;
    icon.innerHTML = color === 'red' ? '<i class="fa-solid fa-xmark"></i>' : (color === 'amber' ? '<i class="fa-solid fa-exclamation"></i>' : '<i class="fa-solid fa-check"></i>');
    document.getElementById('toast-title').innerText = title;
    document.getElementById('toast-message').innerText = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

function toggleMenu(id) { document.getElementById(id).classList.toggle('hidden'); }

// ================= MY DOCS (public) =================
function renderMyDocs() {
    const docs = DATA.documents.filter(d => d.owner === DATA.currentUser.publicName);
    document.getElementById('stat-total').innerText = docs.length;
    document.getElementById('stat-valid').innerText = docs.filter(d => d.status === 'valid').length;
    document.getElementById('stat-revoked').innerText = docs.filter(d => d.status === 'revoked').length;

    document.getElementById('my-docs-cards').innerHTML = docs.map(d => {
        const valid = d.status === 'valid';
        const policy = policyFor(d.docType);
        const required = policy && policy.enabled ? policy.minSigners : 1;
        const qualified = valid && isDocQualified(d);
        const trust = valid ? (qualified ? `Đã Đồng Ký (${d.coSign.trustedCount}/${required})` : `Đang chờ (${d.coSign.trustedCount}/${required})`) : '';
        return `<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col transition-all hover:shadow-md cursor-pointer ${valid ? '' : 'bg-slate-50 opacity-75'}">
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="fa-solid fa-graduation-cap"></i></div>
                ${valid ? `<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><i class="fa-solid fa-check-circle"></i> HỢP LỆ</span>`
                        : `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><i class="fa-solid fa-ban"></i> ĐÃ THU HỒI</span>`}
            </div>
            <h3 class="text-xl font-bold ${valid ? 'text-slate-800' : 'text-slate-500 line-through'} mb-1">${d.title}</h3>
            <p class="text-sm text-slate-500 mb-4 flex-1">Phát hành bởi: ${d.tenantName}</p>
            ${valid ? `<div class="bg-slate-50 rounded-lg p-3 text-xs mb-4 border border-slate-100">
                <div class="flex justify-between mb-1"><span class="text-slate-500">Mã chứng chỉ:</span><span class="font-mono font-medium text-slate-700">${d.id}</span></div>
                <div class="flex justify-between mb-1"><span class="text-slate-500">Ngày cấp:</span><span class="font-medium text-slate-700">${d.issuedAt}</span></div>
                <div class="flex justify-between items-center"><span class="text-slate-500">Độ tin cậy:</span><span class="font-bold text-blue-600 flex items-center gap-1"><i class="fa-solid fa-award"></i> ${trust}</span></div>
            </div>
            <div class="flex gap-2">
            <button onclick="switchRole('public');switchView('verify');document.getElementById('search-input').value='${d.id}';handleSearch()" class="flex-1 text-center text-blue-600 font-semibold hover:bg-blue-50 py-2 rounded-lg transition-colors border border-blue-100 text-sm">Xem chi tiết trên chuỗi</button>
            ${d.content ? `<button onclick="openIpfsViewer('${d.id}')" class="flex-1 text-center text-slate-600 font-semibold hover:bg-slate-50 py-2 rounded-lg transition-colors border border-slate-200 text-sm"><i class="fa-solid fa-file-lines"></i> Nội dung IPFS</button>` : ''}
            </div>`
            : `<p class="text-xs text-red-600 font-medium mb-4 bg-red-50 p-2 rounded border border-red-100">Lý do: ${d.revokedReason}</p>
            <div class="flex gap-2">
            <button class="flex-1 text-center text-slate-500 font-semibold hover:bg-slate-200 py-2 rounded-lg transition-colors border border-slate-200 text-sm">Lịch sử giao dịch</button>
            ${d.content ? `<button onclick="openIpfsViewer('${d.id}')" class="flex-1 text-center text-slate-600 font-semibold hover:bg-slate-50 py-2 rounded-lg transition-colors border border-slate-200 text-sm"><i class="fa-solid fa-file-lines"></i> Nội dung IPFS</button>` : ''}
            </div>`}
        </div>`;
    }).join('');
}

// ================= VERIFY (public) =================
function resetVerify() {
    document.getElementById('search-result').classList.add('hidden');
    document.getElementById('search-notfound').classList.add('hidden');
}

function handleSearch() {
    const id = document.getElementById('search-input').value.trim();
    if (!id) return;
    document.getElementById('search-text').innerText = "Đang tra cứu...";
    document.getElementById('search-loader').classList.remove('hidden');
    document.getElementById('search-result').classList.add('hidden');
    document.getElementById('search-notfound').classList.add('hidden');
    setTimeout(() => {
        document.getElementById('search-text').innerText = "Kiểm tra";
        document.getElementById('search-loader').classList.add('hidden');
        const doc = DATA.documents.find(d => d.id.toLowerCase() === id.toLowerCase());
        if (!doc) { document.getElementById('search-notfound').classList.remove('hidden'); return; }
        renderVerifyResult(doc);
        document.getElementById('search-result').classList.remove('hidden');
    }, 800);
}

function renderVerifyResult(doc) {
    document.getElementById('cert-title').innerText = doc.title;
    document.getElementById('cert-owner').innerText = doc.owner;
    document.getElementById('qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${doc.id}`;
    const ipfsBtn = document.getElementById('cert-ipfs-btn');
    ipfsBtn.classList.toggle('hidden', !doc.content);
    ipfsBtn.onclick = () => openIpfsViewer(doc.id);

    const statusBadge = document.getElementById('cert-status-badge');
    const revokedWarning = document.getElementById('revoked-warning');
    const trustContainer = document.getElementById('trust-container');
    const revoked = doc.status === 'revoked';

    if (revoked) {
        statusBadge.innerHTML = `<i class="fa-solid fa-xmark-circle"></i> KHÔNG CÒN HIỆU LỰC`;
        statusBadge.className = 'bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1';
        document.getElementById('revoked-reason-text').innerText = doc.revokedReason || '';
        revokedWarning.classList.remove('hidden');
        trustContainer.classList.add('opacity-50', 'grayscale');
    } else {
        statusBadge.innerHTML = `<i class="fa-solid fa-check-circle"></i> HỢP LỆ`;
        statusBadge.className = 'bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1';
        revokedWarning.classList.add('hidden');
        trustContainer.classList.remove('opacity-50', 'grayscale');
    }

    const policy = policyFor(doc.docType);
    const required = policy && policy.enabled ? policy.minSigners : 1;
    const qualified = isDocQualified(doc);
    document.getElementById('trust-progress').style.width = `${Math.min(100, doc.coSign.trustedCount / required * 100)}%`;
    document.getElementById('trust-progress').className = `h-2.5 rounded-full transition-all duration-1000 ${qualified ? 'bg-emerald-500' : 'bg-blue-600'}`;
    document.getElementById('trust-fraction').innerText = `${doc.coSign.trustedCount}/${required}`;
    document.getElementById('trust-fraction').className = `text-xl font-bold ${qualified ? 'text-emerald-600' : 'text-blue-600'}`;
    document.getElementById('trust-status-text').innerText = qualified ? 'Đã đạt độ tin cậy cao nhất' : `Cần thêm chữ ký/vai trò quản lý`;

    let signersHtml = `<div class="flex items-center gap-3 text-sm"><div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><i class="fa-solid fa-check text-xs"></i></div><span class="text-slate-600">Phát hành bởi: <strong>${doc.issuer}</strong></span></div>`;
    doc.coSign.trustedRoleIds.forEach(r => {
        signersHtml += `<div class="flex items-center gap-3 text-sm"><div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><i class="fa-solid fa-check text-xs"></i></div><span class="text-slate-600">Đã xác nhận vai trò: <strong>${roleLabel(r)}</strong></span></div>`;
    });
    missingRequiredRoles(doc).forEach(r => {
        signersHtml += `<div class="flex items-center gap-3 text-sm"><div class="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center"><i class="fa-solid fa-hourglass-half text-xs"></i></div><span class="text-slate-500 italic">Đang chờ: <strong>${roleLabel(r)}</strong></span></div>`;
    });
    document.getElementById('signers-list').innerHTML = signersHtml;
}

// ================= EXPLORER (public) =================
function renderExplorer() {
    const ex = DATA.explorer;
    document.getElementById('explorer-tvl').innerText = fmtEth(ex.tvlEth);
    document.getElementById('explorer-tenant-count').innerText = `${DATA.tenants.filter(t => t.isActive).length} Active`;
    document.getElementById('explorer-doc-count').innerText = ex.totalDocuments.toLocaleString('vi-VN');

    document.getElementById('explorer-ranking').innerHTML = ex.ranking.map((r, i) => `
        <div class="flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-8 h-8 font-bold text-slate-400 bg-slate-50 rounded flex items-center justify-center">#${i + 1}</div><div><p class="font-bold text-slate-700 text-sm">${r.name}</p></div></div><div class="text-right"><p class="font-bold text-blue-600 text-sm">${fmtEth(r.stakeEth)} ETH</p></div></div>`).join('');

    document.getElementById('explorer-events').innerHTML = ex.events.map(e => `
        <div class="flex gap-4"><div class="w-8 h-8 rounded-full bg-${e.color}-100 text-${e.color}-600 flex items-center justify-center shrink-0"><i class="fa-solid ${e.icon} text-xs"></i></div><div><p class="text-sm font-medium text-slate-700">${e.text}</p><p class="text-xs text-slate-400 mt-1">${e.time}</p></div></div>`).join('');

    document.getElementById('explorer-tenant-table').innerHTML = DATA.tenants.map(t => `
        <tr class="border-b border-slate-100"><td class="p-3 font-medium text-sm">${t.name}</td><td class="p-3 text-sm font-bold text-blue-600">${fmtEth(t.stakeTotalEth)} ETH</td><td class="p-3">${t.isActive ? '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">ACTIVE</span>' : '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">SUSPENDED</span>'}</td></tr>`).join('');
}

function lookupRecoveryAlias() {
    const q = document.getElementById('recovery-lookup-input').value.trim().toLowerCase();
    const resultEl = document.getElementById('recovery-lookup-result');
    if (!q) { resultEl.innerHTML = ''; return; }
    const hit = DATA.recoveryAliases.find(a => {
        const op = DATA.operators.find(o => o.id === a.currentOperatorId);
        return a.rootAddress.toLowerCase().includes(q) || (op && op.name.toLowerCase().includes(q));
    });
    if (!hit) { resultEl.innerHTML = `<p class="text-sm text-slate-500 mt-3">Không tìm thấy lịch sử khôi phục nào khớp.</p>`; return; }
    const op = DATA.operators.find(o => o.id === hit.currentOperatorId);
    resultEl.innerHTML = `<div class="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <p><strong>${op ? op.name : hit.currentOperatorId}</strong> (${hit.tenantName}) là kết quả khôi phục từ ví gốc <span class="font-mono">${hit.rootAddress}</span>.</p>
        <p class="text-slate-500 mt-1">Khôi phục ngày ${hit.recoveredAt} — Lý do: ${hit.reason}</p>
    </div>`;
}

// ================= ISSUE (operator) =================
function renderIssue() {
    document.getElementById('issue-stake-badge').innerText = `${fmtEth(me().stakeEth)} ETH`;
    document.getElementById('issue-doctype-select').innerHTML = DATA.coSignPolicies.map(p =>
        `<option value="${p.docType}">${p.label}${p.enabled ? ` (Cần ${p.minSigners} chữ ký tin cậy)` : ' (Không cần đồng ký)'}</option>`).join('');

    const myDocs = DATA.documents.filter(d => d.tenantId === MY_TENANT_ID);
    document.getElementById('issue-history-list').innerHTML = myDocs.map(d =>
        `<div class="p-3 border border-slate-100 rounded-lg bg-slate-50"><p class="font-semibold text-sm">${d.id}</p><p class="text-xs text-slate-500">${d.owner}</p></div>`).join('');
}

function handleIssue() {
    const btn = document.getElementById('btn-issue');
    const owner = document.getElementById('issue-owner-input').value.trim() || 'Học viên';
    const docType = Number(document.getElementById('issue-doctype-select').value);
    btn.disabled = true;
    btn.innerHTML = `<div class="loader border-white border-top-transparent h-4 w-4"></div>`;
    setTimeout(() => {
        const policy = policyFor(docType);
        const wl = policy && policy.enabled ? whitelistEntry(docType, DATA.currentUser.operatorId) : null;
        const issuerCounts = policy && policy.enabled ? !!(wl && me().stakeEth >= policy.minStakeEth) : true;
        const id = `CERT-${Math.floor(1000 + Math.random() * 9000)}-NEW`;
        const cid = `Qm${Math.random().toString(36).slice(2, 15)}${Math.random().toString(36).slice(2, 15)}`;
        const pages = policy && policy.enabled
            ? [
                { heading: 'Trang bìa', body: `${policy.label.toUpperCase()}\n\nCấp cho: ${owner}\n${myTenant().name}` },
                { heading: 'Nội dung', body: `Tài liệu được neo trên IPFS (CID: ${cid}) và đối chiếu bằng fileHash trên chuỗi.` },
                { heading: 'Chữ ký & Xác thực số', body: `Ký bởi: ${me().name}\nMã băm tài liệu được neo trên chuỗi, đối chiếu được với nội dung trang này để chống làm giả.` }
              ]
            : [{ heading: policy ? policy.label : `Loại ${docType}`, body: `Cấp cho: ${owner}\n${myTenant().name}` }];
        DATA.documents.push({
            id, title: `Chứng Từ (${policy ? policy.label : docType})`, owner, tenantId: MY_TENANT_ID, tenantName: myTenant().name,
            issuer: me().name, issuedAt: TODAY, docType, status: 'valid', cid, content: { pages },
            coSign: { trustedCount: issuerCounts ? 1 : 0, trustedRoleIds: issuerCounts && wl ? [wl.roleId] : [], qualified: false }
        });
        DATA.explorer.totalDocuments += 1;
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-file-signature"></i> Ký & Lưu Blockchain`;
        renderIssue();
        showToast("Thành công", `Đã neo chứng chỉ ${id}.`);
    }, 800);
}

// ================= COSIGN (operator) =================
function renderCosign() {
    const pending = DATA.documents.filter(d => d.tenantId === MY_TENANT_ID && d.status === 'valid' && !isDocQualified(d));
    document.getElementById('cosign-badge').innerText = pending.length;
    document.getElementById('empty-cosign').classList.toggle('hidden', pending.length > 0);
    document.getElementById('cosign-table-body').innerHTML = pending.map(d => `
        <tr class="border-b border-slate-100" id="row-cosign-${d.id}">
            <td class="p-4 font-mono text-sm text-blue-600 font-medium">${d.id}</td>
            <td class="p-4"><p class="font-semibold text-sm">${d.owner}</p></td>
            <td class="p-4 text-right"><button onclick="handleCoSign('${d.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 ml-auto"><i class="fa-solid fa-pen-nib"></i> Ký duyệt</button></td>
        </tr>`).join('');
}

function handleCoSign(docId) {
    const doc = DATA.documents.find(d => d.id === docId);
    const policy = policyFor(doc.docType);
    if (policy && policy.enabled) {
        const wl = whitelistEntry(doc.docType, DATA.currentUser.operatorId);
        if (!wl) { showToast("Lỗi", "Bạn chưa được whitelist đồng ký loại chứng chỉ này (cấu hình tại Tham số Hợp Đồng).", "red"); return; }
        if (me().stakeEth < policy.minStakeEth) { showToast("Lỗi", "Cọc của bạn chưa đạt mức tối thiểu để đồng ký loại này.", "red"); return; }
    }
    const row = document.getElementById(`row-cosign-${docId}`);
    row.lastElementChild.innerHTML = `<div class="loader border-emerald-600 border-top-transparent h-4 w-4 ml-auto"></div>`;
    setTimeout(() => {
        doc.coSign.trustedCount += 1;
        if (policy && policy.enabled) {
            const wl = whitelistEntry(doc.docType, DATA.currentUser.operatorId);
            if (wl && !doc.coSign.trustedRoleIds.includes(wl.roleId)) doc.coSign.trustedRoleIds.push(wl.roleId);
        }
        const qualified = isDocQualified(doc);
        renderCosign();
        showToast("Thành công", qualified ? "Đã đạt độ tin cậy." : "Đã ghi nhận chữ ký.");
    }, 800);
}

// ================= STAKE (operator) =================
function renderStake() {
    const op = me();
    document.getElementById('stake-amount').innerText = `${fmtEth(op.stakeEth)} ETH`;
    document.getElementById('btn-unstake').classList.toggle('hidden', !!op.unstakePending);
    document.getElementById('unstake-pending-area').classList.toggle('hidden', !op.unstakePending);
    document.getElementById('unstake-pending-area').innerText = `Đang đếm ngược Cooldown (${myTenant().unstakeCooldownHours}h)`;

    const topupDisabled = !op.isActive;
    document.getElementById('btn-topup').disabled = topupDisabled;
    document.getElementById('btn-topup').classList.toggle('opacity-50', topupDisabled);
    document.getElementById('topup-disabled-note').classList.toggle('hidden', !topupDisabled);
}

function requestUnstake() {
    const btn = document.getElementById('btn-unstake');
    btn.innerHTML = `<div class="loader border-red-600 border-top-transparent h-4 w-4"></div> Đang gửi lệnh...`;
    setTimeout(() => { me().unstakePending = true; renderStake(); showToast("Thành công", "Chờ Cooldown."); }, 800);
}

function topUpStake() {
    const input = document.getElementById('topup-input');
    const amount = Number(input.value);
    if (!amount || amount <= 0) { showToast("Lỗi", "Nhập số ETH hợp lệ.", "red"); return; }
    const btn = document.getElementById('btn-topup');
    btn.innerHTML = `<div class="loader border-blue-600 border-top-transparent h-4 w-4"></div>`;
    setTimeout(() => {
        me().stakeEth += amount;
        input.value = '';
        btn.innerHTML = `<i class="fa-solid fa-circle-plus"></i> Nạp Thêm`;
        renderStake();
        showToast("Thành công", `Đã nạp thêm ${fmtEth(amount)} ETH.`);
    }, 800);
}

// ================= SECURITY (operator) =================
function renderSecurity() {
    const op = me();
    document.getElementById('delegate-current').innerText = op.recoveryDelegateId
        ? `Ví dự phòng hiện tại: ${op.recoveryDelegateId}` : 'Chưa thiết lập ví dự phòng.';
    document.getElementById('delegate-input').value = '';
}

function saveDelegate() {
    const input = document.getElementById('delegate-input');
    if (!input.value.trim()) { showToast("Lỗi", "Nhập địa chỉ ví dự phòng.", "red"); return; }
    const btn = document.getElementById('btn-save-delegate');
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    setTimeout(() => {
        me().recoveryDelegateId = input.value.trim();
        btn.innerHTML = `Đã Lưu <i class="fa-solid fa-check ml-1"></i>`;
        btn.classList.replace('bg-indigo-600', 'bg-emerald-600');
        renderSecurity();
        showToast("Đã thiết lập", "Ghi nhận Ví khôi phục.", "indigo");
    }, 500);
}

// ================= RECOVERY BY DELEGATE (operator) =================
function renderRecovery() {
    const lost = DATA.operators.find(o => o.recoveryDelegateId === DATA.currentUser.operatorId && !o.isActive && !o.recovered);
    document.getElementById('recovery-empty-area').classList.toggle('hidden', !!lost);
    document.getElementById('recovery-action-area').classList.toggle('hidden', !lost);
    document.getElementById('recovery-success-area').classList.add('hidden');
    if (lost) {
        document.getElementById('recovery-target-info').innerText = `Xác nhận di chuyển toàn bộ lịch sử và ${fmtEth(lost.stakeEth)} ETH từ ví của "${lost.name}" sang ví này.`;
        document.getElementById('btn-recover').dataset.operatorId = lost.id;
    }
}

function executeRecovery() {
    const btn = document.getElementById('btn-recover');
    const operatorId = btn.dataset.operatorId;
    btn.innerHTML = `<div class="loader border-white border-top-transparent h-5 w-5"></div> Đang di chuyển...`;
    setTimeout(() => {
        const lost = DATA.operators.find(o => o.id === operatorId);
        lost.recovered = true;
        DATA.recoveryAliases.push({ currentOperatorId: DATA.currentUser.operatorId, rootAddress: operatorId, tenantName: myTenant().name, recoveredAt: TODAY, reason: 'Tự khôi phục qua ví dự phòng' });
        document.getElementById('recovery-action-area').classList.add('hidden');
        document.getElementById('recovery-success-area').classList.remove('hidden');
        showToast("Thành công", "Tài sản an toàn.");
    }, 1200);
}

// ================= HR (tenant) =================
function renderHr() {
    const rows = DATA.operators.filter(o => o.tenantId === MY_TENANT_ID && o.id !== 'me' && !o.recovered);
    document.getElementById('hr-table-body').innerHTML = rows.map(op => `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="p-4"><p class="font-bold text-slate-800 text-sm">${op.name}</p>${op.flaggedNote ? `<p class="text-xs text-amber-600">${op.flaggedNote}</p>` : ''}</td>
            <td class="p-4 text-sm font-bold text-slate-700">${fmtEth(op.stakeEth)} ETH</td>
            <td class="p-4"><button onclick="toggleHrActive('${op.id}')" class="${op.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} px-3 py-1 rounded text-xs font-bold">${op.isActive ? 'HOẠT ĐỘNG' : 'BẬT HĐ'}</button></td>
        </tr>`).join('');
}

function toggleHrActive(operatorId) {
    const op = DATA.operators.find(o => o.id === operatorId);
    op.isActive = !op.isActive;
    if (op.isActive) op.flaggedNote = null;
    renderHr();
    showToast("Thành công", op.isActive ? "Đã kích hoạt." : "Đã tạm ngưng hoạt động.");
}

// ================= SLASH (tenant) =================
function renderSlash() {
    const rows = DATA.operators.filter(o => o.tenantId === MY_TENANT_ID && o.id !== 'me' && o.isActive);
    document.getElementById('slash-table-body').innerHTML = rows.map(op => `
        <tr class="border-b border-slate-100" id="row-operator-${op.id}">
            <td class="p-4"><p class="font-semibold text-sm">${op.name}</p>${op.flaggedNote ? `<p class="text-xs text-red-500"><i class="fa-solid fa-flag"></i> ${op.flaggedNote}</p>` : ''}</td>
            <td class="p-4"><span class="font-bold" id="op-${op.id}-stake">${fmtEth(op.stakeEth)} ETH</span></td>
            <td class="p-4" id="op-${op.id}-status"><span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">HOẠT ĐỘNG</span></td>
            <td class="p-4 text-right" id="op-${op.id}-actions">
                <div class="flex justify-end relative">
                    <button onclick="toggleMenu('slash-menu-${op.id}')" class="bg-slate-100 px-3 py-2 rounded-lg text-sm"><i class="fa-solid fa-gavel"></i> Phạt</button>
                    <div id="slash-menu-${op.id}" class="hidden absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl z-20 text-left overflow-hidden">
                        <button onclick="executeSlash('${op.id}','hard')" class="w-full text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600 font-bold border-b border-slate-100">Hard-slash: Tịch thu 100%</button>
                        ${DATA.violationPenalties.map(p => `<button onclick="executeSlash('${op.id}','soft',${p.code})" class="w-full text-left px-4 py-3 hover:bg-amber-50 text-sm text-amber-700">Soft-slash: ${p.label} (${p.bps / 100}%)</button>`).join('')}
                    </div>
                </div>
            </td>
        </tr>`).join('');
}

function executeSlash(operatorId, mode, code) {
    toggleMenu('slash-menu-' + operatorId);
    const actionsDiv = document.getElementById(`op-${operatorId}-actions`);
    actionsDiv.innerHTML = `<div class="loader border-amber-500 border-top-transparent h-5 w-5 ml-auto"></div>`;
    setTimeout(() => {
        const op = DATA.operators.find(o => o.id === operatorId);
        let msg;
        if (mode === 'hard') {
            op.stakeEth = 0; op.isActive = false;
            msg = 'Đã tịch thu 100% tiền cọc.';
        } else {
            const penalty = DATA.violationPenalties.find(p => p.code === code);
            const cut = Math.max(op.stakeEth * penalty.bps / 10000, 0.01);
            op.stakeEth = Math.max(0, op.stakeEth - cut);
            msg = `Đã trừ ${fmtEth(cut)} ETH (${penalty.label}).`;
            if (op.stakeEth < myTenant().minStakeEth) {
                op.isActive = false;
                msg += ' Stake dưới ngưỡng tối thiểu → tự động tạm ngưng hoạt động.';
            }
        }
        DATA.explorer.events.unshift({ icon: 'fa-gavel', color: 'red', text: `<span class="font-bold text-red-600">Xử Phạt:</span> ${op.name} bị phạt.`, time: 'vừa xong' });
        renderSlash();
        showToast(op.isActive ? "Đã xử phạt" : "Đã xử phạt & tạm ngưng", msg, "amber");
    }, 800);
}

// ================= CONFIG (tenant) =================
let configWhitelistDocType = null;

function renderConfig() {
    const t = myTenant();
    document.getElementById('cfg-minstake-range').value = t.minStakeEth;
    document.getElementById('cfg-minstake-label').innerText = `${fmtEth(t.minStakeEth)} ETH`;
    document.getElementById('cfg-cooldown-range').value = t.unstakeCooldownHours;
    document.getElementById('cfg-cooldown-label').innerText = `${t.unstakeCooldownHours} Giờ`;

    document.getElementById('cosign-policy-table-body').innerHTML = DATA.coSignPolicies.map(p => `
        <tr class="border-b border-slate-100">
            <td class="p-3 font-medium text-sm">${p.label} <span class="text-xs text-slate-400 font-mono">#${p.docType}</span></td>
            <td class="p-3 text-center"><input type="checkbox" id="policy-enabled-${p.docType}" ${p.enabled ? 'checked' : ''} onchange="renderConfig()" class="w-4 h-4"></td>
            <td class="p-3"><input type="number" min="1" id="policy-minsigners-${p.docType}" value="${p.minSigners}" ${p.enabled ? '' : 'disabled'} class="w-16 px-2 py-1 border ${p.enabled ? 'border-slate-300' : 'bg-slate-100 border-slate-200'} rounded text-center text-sm font-bold"></td>
            <td class="p-3"><input type="number" min="0" step="0.5" id="policy-minstake-${p.docType}" value="${p.minStakeEth}" ${p.enabled ? '' : 'disabled'} class="w-20 px-2 py-1 border ${p.enabled ? 'border-slate-300' : 'bg-slate-100 border-slate-200'} rounded text-center text-sm font-bold"></td>
            <td class="p-3">${DATA.roleCatalog.map(r => `<label class="inline-flex items-center gap-1 mr-3 text-xs ${p.enabled ? 'text-slate-600' : 'text-slate-300'}"><input type="checkbox" id="policy-role-${p.docType}-${r.roleId}" ${p.requiredRoleIds.includes(r.roleId) ? 'checked' : ''} ${p.enabled ? '' : 'disabled'} class="w-3.5 h-3.5">${r.label}</label>`).join('')}</td>
        </tr>`).join('');

    if (configWhitelistDocType === null || !DATA.coSignPolicies.some(p => p.docType === configWhitelistDocType)) {
        configWhitelistDocType = DATA.coSignPolicies[0]?.docType ?? null;
    }
    document.getElementById('whitelist-doctype-select').innerHTML = DATA.coSignPolicies.map(p =>
        `<option value="${p.docType}" ${p.docType === configWhitelistDocType ? 'selected' : ''}>${p.label} (#${p.docType})</option>`).join('');
    renderWhitelistTable();

    document.getElementById('penalty-table-body').innerHTML = DATA.violationPenalties.map(p => `
        <tr class="border-b border-slate-100"><td class="p-3 text-sm font-mono">#${p.code}</td><td class="p-3 text-sm">${p.label}</td><td class="p-3 text-sm font-bold text-right">${p.bps / 100}%</td></tr>`).join('');
}

document.addEventListener('input', e => {
    if (e.target.id === 'cfg-minstake-range') document.getElementById('cfg-minstake-label').innerText = `${fmtEth(e.target.value)} ETH`;
    if (e.target.id === 'cfg-cooldown-range') document.getElementById('cfg-cooldown-label').innerText = `${e.target.value} Giờ`;
});

function addCoSignPolicy() {
    const docType = Number(document.getElementById('new-doctype-id').value);
    const label = document.getElementById('new-doctype-label').value.trim();
    if (!docType || docType <= 0 || !label) { showToast("Lỗi", "Nhập mã loại chứng chỉ (số) và tên hợp lệ.", "red"); return; }
    if (DATA.coSignPolicies.some(p => p.docType === docType)) { showToast("Lỗi", "Mã loại chứng chỉ này đã tồn tại.", "red"); return; }
    DATA.coSignPolicies.push({ docType, label, enabled: false, minSigners: 1, minStakeEth: 0, requiredRoleIds: [] });
    document.getElementById('new-doctype-id').value = '';
    document.getElementById('new-doctype-label').value = '';
    renderConfig();
    showToast("Thành công", `Đã tạo loại chứng chỉ "${label}".`);
}

function changeWhitelistDocType(docType) {
    configWhitelistDocType = Number(docType);
    renderWhitelistTable();
}

function renderWhitelistTable() {
    const docType = configWhitelistDocType;
    const rows = DATA.operators.filter(o => o.tenantId === MY_TENANT_ID && !o.recovered);
    document.getElementById('whitelist-table-body').innerHTML = rows.map(op => {
        const wl = whitelistEntry(docType, op.id);
        return `<tr class="border-b border-slate-100">
            <td class="p-3 text-sm font-medium">${op.name}</td>
            <td class="p-3 text-center"><input type="checkbox" ${wl ? 'checked' : ''} onchange="toggleCoSignWhitelist(${docType}, '${op.id}', this.checked)" class="w-4 h-4"></td>
            <td class="p-3"><select onchange="setCoSignRole(${docType}, '${op.id}', this.value)" ${wl ? '' : 'disabled'} class="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none">
                ${DATA.roleCatalog.map(r => `<option value="${r.roleId}" ${wl && wl.roleId === r.roleId ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select></td>
        </tr>`;
    }).join('');
}

function toggleCoSignWhitelist(docType, operatorId, checked) {
    if (checked) {
        DATA.coSignWhitelist.push({ docType, operatorId, roleId: DATA.roleCatalog[0].roleId });
    } else {
        DATA.coSignWhitelist = DATA.coSignWhitelist.filter(w => !(w.docType === docType && w.operatorId === operatorId));
    }
    renderWhitelistTable();
    showToast("Thành công", checked ? "Đã whitelist đồng ký." : "Đã gỡ whitelist.", "blue");
}

function setCoSignRole(docType, operatorId, roleId) {
    const wl = whitelistEntry(docType, operatorId);
    if (wl) wl.roleId = Number(roleId);
    showToast("Thành công", "Đã cập nhật vai trò đồng ký.", "blue");
}

function addViolationPenalty() {
    const code = Number(document.getElementById('penalty-code-input').value);
    const label = document.getElementById('penalty-label-input').value.trim();
    const pct = Number(document.getElementById('penalty-bps-input').value);
    if (!code || !label || !pct || pct <= 0 || pct > 100) { showToast("Lỗi", "Điền đủ mã lỗi, mô tả, % hợp lệ (0-100).", "red"); return; }
    if (DATA.violationPenalties.some(p => p.code === code)) { showToast("Lỗi", "Mã lỗi đã tồn tại.", "red"); return; }
    DATA.violationPenalties.push({ code, label, bps: pct * 100 });
    document.getElementById('penalty-code-input').value = '';
    document.getElementById('penalty-label-input').value = '';
    document.getElementById('penalty-bps-input').value = '';
    renderConfig();
    showToast("Thành công", "Đã thêm mức phạt mới.");
}

function saveConfig() {
    const btn = document.getElementById('btn-save-config');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<div class="loader border-white border-top-transparent h-4 w-4"></div> Đang cập nhật...`;
    setTimeout(() => {
        const t = myTenant();
        t.minStakeEth = Number(document.getElementById('cfg-minstake-range').value);
        t.unstakeCooldownHours = Number(document.getElementById('cfg-cooldown-range').value);
        DATA.coSignPolicies.forEach(p => {
            p.enabled = document.getElementById(`policy-enabled-${p.docType}`).checked;
            p.minSigners = Math.max(1, Number(document.getElementById(`policy-minsigners-${p.docType}`).value) || 1);
            p.minStakeEth = Math.max(0, Number(document.getElementById(`policy-minstake-${p.docType}`).value) || 0);
            p.requiredRoleIds = DATA.roleCatalog.map(r => r.roleId).filter(rid => document.getElementById(`policy-role-${p.docType}-${rid}`).checked);
        });
        renderConfig();
        btn.innerHTML = originalHTML;
        showToast("Thành công", "Đã lưu Smart Contract. Ngưỡng mới áp dụng ngay cho các hồ sơ đang chờ ký (chưa qualified).");
    }, 800);
}

// ================= REVOKE (tenant) =================
function renderRevoke() {
    const docs = DATA.documents.filter(d => d.tenantId === MY_TENANT_ID);
    document.getElementById('revoke-table-body').innerHTML = docs.map(d => `
        <tr class="border-b border-slate-100 ${d.status === 'revoked' ? 'bg-red-50/50' : ''}">
            <td class="p-4 font-mono text-sm">${d.id}</td>
            <td class="p-4">${d.status === 'valid' ? '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">ĐANG CÓ HIỆU LỰC</span>' : '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold"><i class="fa-solid fa-ban"></i> ĐÃ THU HỒI</span>'}</td>
            <td class="p-4 text-right">${d.status === 'valid' ? `<button onclick="executeRevoke('${d.id}')" class="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm ml-auto transition-colors"><i class="fa-solid fa-ban"></i> Thu hồi</button>` : '<span class="text-xs font-bold text-slate-400 uppercase">Đã xử lý</span>'}</td>
        </tr>`).join('');
}

function executeRevoke(docId) {
    const reason = document.getElementById('revoke-reason-input').value.trim() || 'Không nêu lý do cụ thể.';
    renderRevokePending(docId);
    setTimeout(() => {
        const doc = DATA.documents.find(d => d.id === docId);
        doc.status = 'revoked';
        doc.revokedReason = reason;
        renderRevoke();
        showToast("Đã thu hồi", "Hủy tính pháp lý.", "amber");
    }, 1000);
}

function renderRevokePending(docId) {
    document.querySelectorAll(`#revoke-table-body tr`).forEach(tr => {
        if (tr.children[0].innerText === docId) tr.children[2].innerHTML = `<div class="loader border-red-600 border-top-transparent h-4 w-4 ml-auto"></div>`;
    });
}

// ================= PLATFORM (protocol admin) =================
function renderPlatform() {
    document.getElementById('tenant-table-body').innerHTML = DATA.tenants.map(t => `
        <tr class="border-b border-slate-100 ${t.isActive ? '' : 'bg-red-50'}">
            <td class="p-4 font-bold text-blue-800">${t.name}</td>
            <td class="p-4">${t.isActive ? '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">ACTIVE</span>' : '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">SUSPENDED</span>'}</td>
            <td class="p-4 text-right">${t.isActive
                ? `<button onclick="toggleTenantStatus('${t.id}')" class="border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ml-auto transition-colors"><i class="fa-solid fa-power-off"></i> Đình chỉ</button>`
                : `<button onclick="toggleTenantStatus('${t.id}')" class="border border-emerald-200 text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ml-auto transition-colors"><i class="fa-solid fa-play"></i> Khôi phục HĐ</button>`}</td>
        </tr>`).join('');
}

function toggleTenantStatus(tenantId) {
    const t = DATA.tenants.find(x => x.id === tenantId);
    t.isActive = !t.isActive;
    renderPlatform();
    showToast("Thành công", "Đã cập nhật.", t.isActive ? "emerald" : "red");
}

function createTenant() {
    const id = document.getElementById('new-tenant-id').value.trim();
    const name = document.getElementById('new-tenant-name').value.trim();
    const admin = document.getElementById('new-tenant-admin').value.trim();
    const opManager = document.getElementById('new-tenant-opmanager').value.trim();
    const treasury = document.getElementById('new-tenant-treasury').value.trim();
    const minStake = Number(document.getElementById('new-tenant-minstake').value);
    const cooldown = Number(document.getElementById('new-tenant-cooldown').value);

    if (!id || !name || !admin || !opManager || !treasury) { showToast("Lỗi", "Điền đủ thông tin bắt buộc.", "red"); return; }
    if (DATA.tenants.some(t => t.id === id)) { showToast("Lỗi", "Mã tổ chức đã tồn tại.", "red"); return; }
    if (admin === opManager || admin === treasury || opManager === treasury) { showToast("Lỗi", "3 vai trò (Admin/QL vận hành/Treasury) phải là 3 địa chỉ khác nhau.", "red"); return; }
    if (!minStake || minStake <= 0 || !cooldown || cooldown <= 0) { showToast("Lỗi", "Mức cọc tối thiểu và cooldown phải > 0.", "red"); return; }

    const btn = document.getElementById('btn-create-tenant');
    btn.innerHTML = `<div class="loader border-white border-top-transparent h-4 w-4"></div>`;
    setTimeout(() => {
        DATA.tenants.push({ id, name, admin, operatorManager: opManager, treasury, isActive: true, minStakeEth: minStake, unstakeCooldownHours: cooldown, stakeTotalEth: 0 });
        ['new-tenant-id', 'new-tenant-name', 'new-tenant-admin', 'new-tenant-opmanager', 'new-tenant-treasury'].forEach(elId => document.getElementById(elId).value = '');
        btn.innerHTML = `<i class="fa-solid fa-plus"></i> Khởi Tạo Tổ Chức`;
        renderPlatform();
        showToast("Thành công", `Đã khởi tạo tổ chức "${name}" trên chuỗi.`);
    }, 800);
}

// ================= TREASURY (tenant) =================
function renderTreasury() {
    const t = myTenant();
    document.getElementById('treasury-current').innerText = t.treasury;
    document.getElementById('treasury-input').value = '';
}

function changeTreasury() {
    const t = myTenant();
    const input = document.getElementById('treasury-input');
    const val = input.value.trim();
    if (!val) { showToast("Lỗi", "Nhập địa chỉ ví quỹ mới.", "red"); return; }
    if (val === t.admin || val === t.operatorManager) { showToast("Lỗi", "Treasury không được trùng Admin hoặc QL Vận hành.", "red"); return; }
    const btn = document.getElementById('btn-save-treasury');
    btn.innerHTML = `<div class="loader border-white border-top-transparent h-4 w-4"></div>`;
    setTimeout(() => {
        t.treasury = val;
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Cập Nhật Treasury`;
        renderTreasury();
        showToast("Thành công", "Đã đổi tài khoản quỹ.");
    }, 800);
}

// ================= EMERGENCY RECOVERY BY ADMIN (tenant) =================
function renderEmergencyRecovery() {
    const stranded = DATA.operators.filter(o => o.tenantId === MY_TENANT_ID && !o.isActive && !o.recoveryDelegateId && !o.recovered);
    const container = document.getElementById('emergency-recovery-list');
    if (stranded.length === 0) {
        container.innerHTML = `<div class="p-12 text-center text-slate-400">Không có nhân viên nào cần khôi phục khẩn cấp.</div>`;
        return;
    }
    container.innerHTML = stranded.map(op => `
        <div class="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
            <div><p class="font-bold text-slate-800">${op.name}</p><p class="text-xs text-red-500">${op.flaggedNote || ''} — ${fmtEth(op.stakeEth)} ETH</p></div>
            <div class="flex gap-2">
                <input type="text" placeholder="Địa chỉ ví mới 0x..." class="border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono">
                <button onclick="recoverByAdmin(this, '${op.id}')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold">Chỉ định ví mới</button>
            </div>
        </div>`).join('');
}

function recoverByAdmin(btn, operatorId) {
    const input = btn.parentElement.querySelector('input');
    if (!input.value.trim()) { showToast("Lỗi", "Nhập địa chỉ ví thay thế.", "red"); return; }
    btn.innerHTML = `<div class="loader border-white border-top-transparent h-4 w-4"></div>`;
    setTimeout(() => {
        const op = DATA.operators.find(o => o.id === operatorId);
        op.recovered = true;
        DATA.recoveryAliases.push({ currentOperatorId: input.value.trim(), rootAddress: operatorId, tenantName: myTenant().name, recoveredAt: TODAY, reason: 'Khôi phục khẩn cấp bởi Operator Manager (không có ví dự phòng)' });
        renderEmergencyRecovery();
        showToast("Thành công", `Đã chuyển toàn bộ tài sản của ${op.name} sang ví mới.`);
    }, 900);
}

init();
