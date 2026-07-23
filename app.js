let DATA = null;
const TODAY = '21/07/2026';

const roleConfig = {
    'public': { title: '<i class="fa-solid fa-earth-americas text-slate-400"></i> Dịch Vụ Công Cộng', defaultView: 'explorer' },
    'operator': { title: '<i class="fa-solid fa-user-tie text-blue-400"></i> Portal Nhân Viên', defaultView: 'issue' },
    'tenant': { title: '<i class="fa-solid fa-building-shield text-amber-400"></i> Admin Doanh Nghiệp', defaultView: 'hr' },
    'admin': { title: '<i class="fa-solid fa-server text-purple-400"></i> Admin Nền Tảng', defaultView: 'platform' }
};

const viewIds = ['verify', 'my-docs', 'account', 'explorer', 'issue', 'cosign', 'slash', 'recovery', 'revoke', 'platform', 'stake', 'config', 'hr', 'security', 'treasury', 'emergency-recovery', 'join', 'apply-tenant'];
const viewBgClass = { revoke: 'bg-amber-500', treasury: 'bg-amber-500', platform: 'bg-purple-600', explorer: 'bg-emerald-600', join: 'bg-emerald-600', 'apply-tenant': 'bg-purple-600', account: 'bg-sky-600' };
const viewIconIdleClass = { revoke: 'text-amber-500', treasury: 'text-amber-500', platform: 'text-purple-500', stake: 'text-blue-400', security: 'text-indigo-400', recovery: 'text-amber-500', slash: 'text-red-400', config: 'text-emerald-400', explorer: 'text-emerald-400', 'emergency-recovery': 'text-amber-500', join: 'text-emerald-400', 'apply-tenant': 'text-purple-400', account: 'text-sky-400' };

const renderers = {
    'my-docs': renderMyDocs, account: renderAccount, verify: resetVerify, explorer: renderExplorer, issue: renderIssue,
    cosign: renderCosign, stake: renderStake, security: renderSecurity, recovery: renderRecovery,
    join: renderJoin, 'apply-tenant': renderApplyTenant,
    hr: renderHr, slash: renderSlash, config: renderConfig, revoke: renderRevoke,
    platform: renderPlatform, treasury: renderTreasury, 'emergency-recovery': renderEmergencyRecovery
};

// Reading public chain data never needs a wallet. Everything else — even just seeing
// "your" documents/profile — needs to know who you are, so it requires a connection.
const NO_WALLET_VIEWS = ['verify', 'explorer'];
// 'recovery' is intentionally NOT gated on active-operator status: recoverOperatorByDelegate
// requires the delegate's wallet to NOT already be an active operator (opposite precondition).
// 'account' is not gated here either — it merges profile editing (gated inline, only shown
// when active) with read-only identity info that any connected wallet, including
// governance/Protocol Admin ones, should be able to see.
const OPERATOR_GATED_VIEWS = ['issue', 'cosign', 'stake', 'security'];

let connectedWallet = null; // { id, label, address, kind, operatorId? } — which wallet is connected, or null

// Every distinct address that actually exists in the system right now — operators, tenant
// governance (admin/operatorManager/treasury), and Protocol Admin. Rebuilt on demand so it
// stays current as new tenants/operators appear (join, tenant creation, recovery...).
function allSystemWallets() {
    const wallets = [];
    DATA.operators.filter(o => !o.recovered).forEach(o => {
        wallets.push({ id: `op-${o.id}`, label: o.name, address: o.address, kind: 'operator', operatorId: o.id });
    });
    DATA.tenants.forEach(t => {
        wallets.push({ id: `tadmin-${t.id}`, label: `${t.name} — Admin`, address: t.admin, kind: 'tenant-admin', tenantId: t.id });
        wallets.push({ id: `topmgr-${t.id}`, label: `${t.name} — QL Vận Hành`, address: t.operatorManager, kind: 'tenant-opmanager', tenantId: t.id });
        wallets.push({ id: `ttreasury-${t.id}`, label: `${t.name} — Treasury`, address: t.treasury, kind: 'treasury', tenantId: t.id });
    });
    wallets.push({ id: 'protocol-admin', label: 'Protocol Admin', address: DATA.protocolAdminAddress, kind: 'protocol-admin' });
    return wallets;
}

async function init() {
    DATA = await fetch('data.json').then(r => r.json());
    switchRole('public');
}

function openConnectModal() {
    document.getElementById('connect-wallet-list').innerHTML = allSystemWallets().map(w => `
        <button onclick="connectWallet('${w.id}')" class="w-full text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-2 transition-colors">
            <span class="text-sm font-medium text-white">${w.label}</span>
            <span class="text-xs font-mono text-slate-400">${w.address}</span>
        </button>`).join('');
    document.getElementById('connect-gate').classList.remove('hidden');
}
function closeConnectModal() { document.getElementById('connect-gate').classList.add('hidden'); }

function connectWallet(walletId) {
    connectedWallet = allSystemWallets().find(w => w.id === walletId);
    closeConnectModal();
    document.getElementById('wallet-address-label').innerText = connectedWallet.label;
    document.getElementById('wallet-connected-badge').classList.remove('hidden');
    document.getElementById('wallet-connected-badge').classList.add('flex');
    document.getElementById('btn-header-connect').classList.add('hidden');
    switchView(currentViewId);
    showToast("Đã kết nối", connectedWallet.label);
}

function disconnectWallet() {
    connectedWallet = null;
    document.getElementById('wallet-connected-badge').classList.add('hidden');
    document.getElementById('wallet-connected-badge').classList.remove('flex');
    document.getElementById('btn-header-connect').classList.remove('hidden');
    if (roleConfig[currentRoleId] && currentRoleId !== 'public') switchRole('public');
    else switchView(currentViewId);
}

function openSidebar() {
    document.getElementById('app-sidebar').classList.add('sidebar-open');
    document.getElementById('sidebar-backdrop').classList.remove('hidden');
}
function closeSidebar() {
    document.getElementById('app-sidebar').classList.remove('sidebar-open');
    document.getElementById('sidebar-backdrop').classList.add('hidden');
}

// The operator identity of whichever wallet is connected — null if connected as a
// governance/protocol-admin wallet (those have no operator record of their own).
function me() { return connectedWallet?.kind === 'operator' ? DATA.operators.find(o => o.id === connectedWallet.operatorId) : null; }
// The tenant governed by the CONNECTED wallet (Tenant-role dashboards) — not the operator's own tenant.
function myTenant() {
    const addr = connectedWallet?.address;
    return DATA.tenants.find(t => t.admin === addr || t.operatorManager === addr) || DATA.tenants[0];
}
// The tenant 'me' the operator actually joined (chosen on the Join page) — distinct from
// myTenant(), which is whichever company the connected wallet governs.
function operatorTenant() { return DATA.tenants.find(t => t.id === me().tenantId) || DATA.tenants[0]; }
function isBusinessOwner() { return !!connectedWallet && DATA.tenants.some(t => t.admin === connectedWallet.address || t.operatorManager === connectedWallet.address || t.treasury === connectedWallet.address); }
function isProtocolAdminWallet() { return connectedWallet?.id === 'protocol-admin'; }

function canAccessRole(roleId) {
    if (roleId === 'public') return true;
    if (!connectedWallet) return false;
    if (roleId === 'admin') return isProtocolAdminWallet();
    if (roleId === 'tenant') return DATA.tenants.some(t => t.admin === connectedWallet.address || t.operatorManager === connectedWallet.address);
    if (roleId === 'operator') {
        if (connectedWallet.kind !== 'operator') return false;
        const op = DATA.operators.find(o => o.id === connectedWallet.operatorId);
        // Being listed as an operator record isn't the same as having actually joined — a wallet
        // that never staked (stakeEth === 0) and isn't active has no real employee identity yet,
        // it's just the demo's placeholder slot before the user goes through the Join flow.
        return !!(op && (op.isActive || op.stakeEth > 0));
    }
    return false;
}
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

let currentRoleId = 'public';

function switchRole(roleId) {
    if (roleId !== 'public' && !connectedWallet) { openConnectModal(); return; }
    if (!canAccessRole(roleId)) {
        const reasons = {
            admin: 'Cần kết nối ví Protocol Admin.',
            tenant: 'Cần kết nối ví đang giữ vai trò Admin/QL Vận hành của một tổ chức.',
            operator: isProtocolAdminWallet()
                ? 'Ví Protocol Admin không được kiêm vai trò Operator.'
                : 'Ví này chưa gia nhập tổ chức nào — hãy Gia Nhập Làm Nhân Viên trước.'
        };
        showToast("Không đủ quyền", reasons[roleId] || 'Ví hiện tại không có quyền này.', "red");
        return;
    }
    currentRoleId = roleId;
    document.getElementById('personal-nav-block').classList.toggle('hidden', roleId === 'admin');

    ['public', 'operator', 'tenant', 'admin'].forEach(r => {
        const btn = document.getElementById(`role-${r}`);
        if (r === roleId) {
            btn.className = `px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all shadow whitespace-nowrap text-white ${r === 'public' ? 'bg-slate-800' : (r === 'operator' ? 'bg-blue-600' : (r === 'tenant' ? 'bg-amber-600' : 'bg-purple-600'))}`;
            btn.querySelector('i').classList.remove('text-slate-300', 'text-blue-600', 'text-amber-600', 'text-purple-600');
            btn.querySelector('i').classList.add('text-white', 'mr-1');
        } else {
            btn.className = `px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap text-slate-600 hover:text-${r === 'operator' ? 'blue' : (r === 'tenant' ? 'amber' : 'purple')}-600`;
            btn.querySelector('i').className = `fa-solid ${r === 'public' ? 'fa-earth-americas text-slate-400' : (r === 'operator' ? 'fa-user-tie' : (r === 'tenant' ? 'fa-building-shield' : 'fa-server'))} mr-1`;
        }
    });

    document.getElementById('sidebar-role-title').innerHTML = roleConfig[roleId].title;

    ['public', 'operator', 'tenant', 'admin'].forEach(r => document.getElementById(`menu-group-${r}`).classList.add('hidden'));
    document.getElementById(`menu-group-${roleId}`).classList.remove('hidden');

    switchView(roleConfig[roleId].defaultView);
}

let currentViewId = 'explorer';

function switchView(viewId) {
    currentViewId = viewId;
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

    // Sidebar badge must reflect reality the moment the Operator role/menu appears, not only
    // after the user has already clicked into the Cosign page (which is the only other place
    // that recomputes it).
    const cosignBadge = document.getElementById('cosign-badge');
    if (cosignBadge) {
        const op = connectedWallet ? me() : null;
        cosignBadge.innerText = op ? pendingCosignDocs(op).length : 0;
    }

    const needsWallet = !NO_WALLET_VIEWS.includes(viewId) && !connectedWallet;
    document.getElementById('connect-required-overlay').classList.toggle('hidden', !needsWallet);

    const identityLockReason = !needsWallet ? identityLockReasonFor(viewId) : null;
    document.getElementById('identity-locked-overlay').classList.toggle('hidden', !identityLockReason);
    if (identityLockReason) document.getElementById('identity-locked-reason').innerText = identityLockReason;

    const needsOperator = !needsWallet && !identityLockReason && OPERATOR_GATED_VIEWS.includes(viewId) && !me().isActive;
    document.getElementById('operator-locked-overlay').classList.toggle('hidden', !needsOperator);
}

// "Chặt chẽ hơn": một ví đã là nhân viên hoặc đã quản trị 1 doanh nghiệp thì không gia
// nhập/đăng ký thêm nữa — tránh 1 ví ôm nhiều thân phận mâu thuẫn trong demo.
function identityLockReasonFor(viewId) {
    if (viewId === 'join') {
        if (isProtocolAdminWallet()) return 'Ví Protocol Admin không được phép giữ vai trò Operator.';
        if (isBusinessOwner()) return 'Ví này đang giữ vai trò quản trị một doanh nghiệp — không thể đồng thời đăng ký làm nhân viên phát hành.';
        if (me()?.isActive) return `Ví này đã là nhân viên đang hoạt động tại ${operatorTenant().name}. Xem tại Hồ Sơ Của Tôi / Tiền Cọc.`;
    }
    if (viewId === 'apply-tenant' && isBusinessOwner()) {
        return 'Ví này đã giữ vai trò quản trị một doanh nghiệp trên hệ thống — không cần đăng ký thêm.';
    }
    return null;
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
    const op = me();
    const ownerName = op ? op.name : connectedWallet?.label;
    document.getElementById('my-docs-owner-name').innerText = ownerName || '';
    const docs = DATA.documents.filter(d => d.owner === ownerName);
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

// ================= ACCOUNT (personal profile — aggregates everything this wallet holds) =================
function renderAccount() {
    const op = me();
    switchAccountTab('overview');
    document.getElementById('account-name').innerText = connectedWallet.label;
    document.getElementById('account-address').innerText = connectedWallet.address;
    renderAccountAvatar(connectedWallet.label);

    const governance = DATA.tenants.filter(t => [t.admin, t.operatorManager, t.treasury].includes(connectedWallet.address));
    const badge = document.getElementById('account-role-badge');
    if (isProtocolAdminWallet()) {
        badge.innerText = 'Protocol Admin';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700';
    } else if (governance.length) {
        badge.innerText = 'Quản trị doanh nghiệp';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700';
    } else if (op?.isActive) {
        badge.innerText = 'Operator đang hoạt động';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700';
    } else if (op) {
        badge.innerText = 'Operator tạm ngưng';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500';
    } else {
        badge.innerText = 'Khách';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500';
    }

    document.getElementById('account-operator-status').innerHTML = !op
        ? 'Ví này không phải Operator.'
        : op.isActive
            ? `Đang hoạt động tại ${DATA.tenants.find(t => t.id === op.tenantId)?.name || op.tenantId} — cọc ${fmtEth(op.stakeEth)} ETH. <button onclick="switchView('stake')" class="text-blue-600 font-semibold hover:underline">Xem cọc →</button>`
            : (op.stakeEth > 0 ? `Đã từng đặt cọc (${fmtEth(op.stakeEth)} ETH) nhưng đang tạm ngưng hoạt động.` : `Chưa gia nhập tổ chức nào. <button onclick="switchView('join')" class="text-emerald-600 font-semibold hover:underline">Gia nhập ngay →</button>`);

    document.getElementById('account-governance-status').innerText = governance.length
        ? governance.map(t => {
            const roles = [];
            if (t.admin === connectedWallet.address) roles.push('Admin');
            if (t.operatorManager === connectedWallet.address) roles.push('QL Vận Hành');
            if (t.treasury === connectedWallet.address) roles.push('Treasury');
            return `${roles.join('/')} tại ${t.name}`;
        }).join('; ')
        : 'Không giữ vai trò quản trị (Admin/QL Vận hành/Treasury) của tổ chức nào.';

    const docs = op ? DATA.documents.filter(d => d.owner === op.name) : [];
    document.getElementById('account-docs-status').innerHTML = !op
        ? 'Không áp dụng cho ví quản trị.'
        : docs.length ? `${docs.length} chứng từ (${docs.filter(d => d.status === 'valid').length} hợp lệ). <button onclick="switchView('my-docs')" class="text-blue-600 font-semibold hover:underline">Xem tất cả →</button>` : 'Chưa sở hữu chứng từ nào.';

    const delegateFor = op ? DATA.operators.filter(o => o.recoveryDelegateId === op.id && !o.recovered) : [];
    document.getElementById('account-delegate-status').innerHTML = !op
        ? 'Không áp dụng cho ví quản trị.'
        : delegateFor.length ? `Là ví dự phòng cho: ${delegateFor.map(o => o.name).join(', ')}. <button onclick="switchView('recovery')" class="text-amber-600 font-semibold hover:underline">Đi tới cứu hộ →</button>` : 'Chưa được ai chỉ định làm ví dự phòng.';

    document.getElementById('account-stat-docs').innerText = docs.length;
    document.getElementById('account-stat-stake').innerText = `${fmtEth(op ? op.stakeEth : 0)} ETH`;
    document.getElementById('account-stat-roles').innerText = governance.length;
    document.getElementById('account-stat-trust').innerText = docs.length
        ? `${Math.round(docs.filter(d => d.status === 'valid').length / docs.length * 100)}%` : '—';

    renderAccountActivity(op);

    document.getElementById('account-security-delegate-summary').innerText = !op
        ? 'Không áp dụng cho ví quản trị.'
        : op.recoveryDelegateId
            ? `Ví dự phòng hiện tại: ${DATA.operators.find(o => o.id === op.recoveryDelegateId)?.name || op.recoveryDelegateId}.`
            : 'Chưa thiết lập ví dự phòng.';

    // updateOperatorMetadata requires an active operator — only show the editor then.
    document.getElementById('account-bio-card').classList.toggle('hidden', !op?.isActive);
    if (op?.isActive) document.getElementById('profile-bio-input').value = op.bio || '';
}

// Built entirely from data already tied to this operator (no separate per-wallet event log
// exists in this demo's data model) — governance-only/guest wallets have nothing derivable, so
// they correctly fall through to the empty state.
function renderAccountActivity(op) {
    const events = [];
    if (op) {
        DATA.documents.filter(d => d.issuer === op.name).forEach(d => events.push({
            icon: 'fa-file-signature', color: 'emerald', time: d.issuedAt,
            text: `Phát hành chứng chỉ <span class="font-bold">${d.title}</span> cho ${d.owner}.`
        }));
        DATA.documents.filter(d => d.owner === op.name).forEach(d => events.push({
            icon: d.status === 'revoked' ? 'fa-ban' : 'fa-award', color: d.status === 'revoked' ? 'red' : 'blue', time: d.issuedAt,
            text: d.status === 'revoked' ? `Chứng chỉ <span class="font-bold">${d.title}</span> đã bị thu hồi.` : `Nhận chứng chỉ <span class="font-bold">${d.title}</span> từ ${d.tenantName}.`
        }));
        DATA.recoveryAliases.filter(a => a.currentOperatorId === op.id).forEach(a => events.push({
            icon: 'fa-life-ring', color: 'amber', time: a.recoveredAt,
            text: `Khôi phục ví thành công tại ${a.tenantName} (${a.reason}).`
        }));
    }
    document.getElementById('account-activity-list').innerHTML = events.map(e =>
        `<div class="flex gap-4"><div class="w-8 h-8 rounded-full bg-${e.color}-100 text-${e.color}-600 flex items-center justify-center shrink-0"><i class="fa-solid ${e.icon} text-xs"></i></div><div><p class="text-sm font-medium text-slate-700">${e.text}</p><p class="text-xs text-slate-400 mt-1">${e.time}</p></div></div>`
    ).join('');
    document.getElementById('account-activity-empty').classList.toggle('hidden', events.length > 0);
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

    const tenantSelect = document.getElementById('explorer-operator-tenant-select');
    const prevSelection = tenantSelect.value || myTenant().id;
    tenantSelect.innerHTML = DATA.tenants.map(t => `<option value="${t.id}" ${t.id === prevSelection ? 'selected' : ''}>${t.name}</option>`).join('');
    renderExplorerOperators(prevSelection);
}

function renderExplorerOperators(tenantId) {
    const rows = DATA.operators.filter(o => o.tenantId === tenantId && !o.recovered);
    document.getElementById('explorer-operator-table').innerHTML = rows.length
        ? rows.map(op => `
            <tr class="border-b border-slate-100"><td class="p-3 text-sm font-medium">${op.name}</td><td class="p-3 text-sm font-bold text-blue-600">${fmtEth(op.stakeEth)} ETH</td><td class="p-3">${op.isActive ? '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">HOẠT ĐỘNG</span>' : '<span class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-bold">NGƯNG</span>'}</td></tr>`).join('')
        : `<tr><td colspan="3" class="p-6 text-center text-slate-400 text-sm">Chưa có nhân sự nào.</td></tr>`;
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

    const myDocs = DATA.documents.filter(d => d.tenantId === me().tenantId);
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
        const wl = policy && policy.enabled ? whitelistEntry(docType, me().id) : null;
        const issuerCounts = policy && policy.enabled ? !!(wl && me().stakeEth >= policy.minStakeEth) : true;
        const id = `CERT-${Math.floor(1000 + Math.random() * 9000)}-NEW`;
        const cid = `Qm${Math.random().toString(36).slice(2, 15)}${Math.random().toString(36).slice(2, 15)}`;
        const t = operatorTenant();
        const pages = policy && policy.enabled
            ? [
                { heading: 'Trang bìa', body: `${policy.label.toUpperCase()}\n\nCấp cho: ${owner}\n${t.name}` },
                { heading: 'Nội dung', body: `Tài liệu được neo trên IPFS (CID: ${cid}) và đối chiếu bằng fileHash trên chuỗi.` },
                { heading: 'Chữ ký & Xác thực số', body: `Ký bởi: ${me().name}\nMã băm tài liệu được neo trên chuỗi, đối chiếu được với nội dung trang này để chống làm giả.` }
              ]
            : [{ heading: policy ? policy.label : `Loại ${docType}`, body: `Cấp cho: ${owner}\n${t.name}` }];
        DATA.documents.push({
            id, title: `Chứng Từ (${policy ? policy.label : docType})`, owner, tenantId: t.id, tenantName: t.name,
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
function pendingCosignDocs(op) {
    return DATA.documents.filter(d => d.tenantId === op.tenantId && d.status === 'valid' && !isDocQualified(d));
}

function renderCosign() {
    const pending = pendingCosignDocs(me());
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
        const wl = whitelistEntry(doc.docType, me().id);
        if (!wl) { showToast("Lỗi", "Bạn chưa được whitelist đồng ký loại chứng chỉ này (cấu hình tại Tham số Hợp Đồng).", "red"); return; }
        if (me().stakeEth < policy.minStakeEth) { showToast("Lỗi", "Cọc của bạn chưa đạt mức tối thiểu để đồng ký loại này.", "red"); return; }
    }
    const row = document.getElementById(`row-cosign-${docId}`);
    row.lastElementChild.innerHTML = `<div class="loader border-emerald-600 border-top-transparent h-4 w-4 ml-auto"></div>`;
    setTimeout(() => {
        doc.coSign.trustedCount += 1;
        if (policy && policy.enabled) {
            const wl = whitelistEntry(doc.docType, me().id);
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
    document.getElementById('unstake-pending-text').innerText = `Đang trong thời gian chờ (Cooldown ${operatorTenant().unstakeCooldownHours}h) — sau khi hết hạn bạn tự rút, công ty không thể giữ tiền.`;

    const topupDisabled = !op.isActive;
    document.getElementById('btn-topup').disabled = topupDisabled;
    document.getElementById('btn-topup').classList.toggle('opacity-50', topupDisabled);
    document.getElementById('topup-disabled-note').classList.toggle('hidden', !topupDisabled);
}

function requestUnstake() {
    const btn = document.getElementById('btn-unstake');
    btn.innerHTML = `<div class="loader border-red-600 border-top-transparent h-4 w-4"></div> Đang gửi lệnh...`;
    setTimeout(() => { me().unstakePending = true; renderStake(); showToast("Thành công", "Yêu cầu rút cọc đã ghi nhận. Chờ Cooldown."); }, 800);
}

function executeUnstakeAction() {
    const btn = document.getElementById('btn-execute-unstake');
    btn.innerHTML = `<div class="loader border-white border-top-transparent h-4 w-4"></div> Đang rút...`;
    setTimeout(() => {
        const op = me();
        const amount = op.stakeEth;
        op.stakeEth = 0;
        op.isActive = false;
        op.unstakePending = false;
        renderStake();
        showToast("Thành công", `Đã rút ${fmtEth(amount)} ETH về ví. Tư cách hoạt động đã kết thúc.`);
    }, 800);
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
    const candidates = DATA.operators.filter(o => o.id !== op.id && !o.recovered);
    document.getElementById('delegate-current').innerText = op.recoveryDelegateId
        ? `Ví dự phòng hiện tại: ${DATA.operators.find(o => o.id === op.recoveryDelegateId)?.name || op.recoveryDelegateId}`
        : 'Chưa thiết lập ví dự phòng.';
    document.getElementById('delegate-input').innerHTML = candidates.map(o =>
        `<option value="${o.id}" ${o.id === op.recoveryDelegateId ? 'selected' : ''}>${o.name} (${o.address})</option>`).join('');
}

function saveDelegate() {
    const input = document.getElementById('delegate-input');
    if (!input.value) { showToast("Lỗi", "Chọn một ví làm ví dự phòng.", "red"); return; }
    const btn = document.getElementById('btn-save-delegate');
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    setTimeout(() => {
        me().recoveryDelegateId = input.value;
        btn.innerHTML = `Đã Lưu <i class="fa-solid fa-check ml-1"></i>`;
        btn.classList.replace('bg-indigo-600', 'bg-emerald-600');
        renderSecurity();
        showToast("Đã thiết lập", "Ghi nhận Ví khôi phục.", "indigo");
    }, 500);
}

// ================= PROFILE (operator — requires already-active operator) =================
function saveProfileMetadata() {
    const btn = document.getElementById('btn-save-profile');
    btn.innerHTML = `<div class="loader border-white border-top-transparent h-4 w-4"></div>`;
    setTimeout(() => {
        me().bio = document.getElementById('profile-bio-input').value.trim();
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu Hồ Sơ`;
        showToast("Thành công", "Đã cập nhật hồ sơ.");
    }, 500);
}

// ================= JOIN AS OPERATOR (public — permissionless, no role required) =================
function renderJoin() {
    const operator = me();
    const select = document.getElementById('join-tenant-select');
    const prevValue = select.value || operator.tenantId || DATA.tenants[0].id;
    select.innerHTML = DATA.tenants.map(t => `<option value="${t.id}" ${t.id === prevValue ? 'selected' : ''}>${t.name}</option>`).join('');
    const t = DATA.tenants.find(x => x.id === select.value) || DATA.tenants[0];

    document.getElementById('join-tenant-name').innerText = t.name;
    document.getElementById('join-min-stake').innerText = `${fmtEth(t.minStakeEth)} ETH`;
    if (!operator.isActive) {
        document.getElementById('join-stake-input').value = '';
        document.getElementById('join-bio-input').value = '';
    }
}

function joinAsOperatorAction() {
    const tenantId = document.getElementById('join-tenant-select').value;
    const t = DATA.tenants.find(x => x.id === tenantId);
    const operator = me();
    const stake = Number(document.getElementById('join-stake-input').value);
    const bio = document.getElementById('join-bio-input').value.trim();

    if (operator.isActive) { showToast("Lỗi", "Ví này đã đang hoạt động.", "red"); return; }
    if (!t.isActive) { showToast("Lỗi", "Tổ chức đang tạm khoá, không nhận thành viên mới.", "red"); return; }
    if (!stake || stake < t.minStakeEth) { showToast("Lỗi", `Cần đặt cọc tối thiểu ${fmtEth(t.minStakeEth)} ETH.`, "red"); return; }

    const btn = document.getElementById('btn-join');
    btn.innerHTML = `<div class="loader border-white border-top-transparent h-4 w-4"></div> Đang gửi...`;
    setTimeout(() => {
        operator.isActive = true;
        operator.tenantId = tenantId;
        operator.stakeEth = stake;
        operator.bio = bio;
        t.stakeTotalEth += stake;
        renderJoin();
        btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Kích Hoạt Ví Làm Operator`;
        showToast("Thành công", `Đã kích hoạt ví làm Operator tại ${t.name} với cọc ${fmtEth(stake)} ETH.`);
    }, 800);
}

// ================= APPLY AS TENANT (public — request only, Protocol Admin executes createTenant) =================
function renderApplyTenant() {
    ['apply-tenant-name', 'apply-tenant-admin', 'apply-tenant-opmanager', 'apply-tenant-treasury', 'apply-tenant-minstake', 'apply-tenant-note']
        .forEach(id => document.getElementById(id).value = '');
}

function submitTenantApplication() {
    const name = document.getElementById('apply-tenant-name').value.trim();
    const admin = document.getElementById('apply-tenant-admin').value.trim();
    const opManager = document.getElementById('apply-tenant-opmanager').value.trim();
    const treasury = document.getElementById('apply-tenant-treasury').value.trim();
    const minStake = Number(document.getElementById('apply-tenant-minstake').value);
    const note = document.getElementById('apply-tenant-note').value.trim();

    if (!name || !admin || !opManager || !treasury) { showToast("Lỗi", "Điền đủ thông tin bắt buộc.", "red"); return; }
    if (admin === opManager || admin === treasury || opManager === treasury) { showToast("Lỗi", "3 vai trò đề xuất phải là 3 địa chỉ khác nhau.", "red"); return; }
    if (!minStake || minStake <= 0) { showToast("Lỗi", "Mức cọc tối thiểu đề xuất phải > 0.", "red"); return; }

    const btn = document.getElementById('btn-apply-tenant');
    btn.innerHTML = `<div class="loader border-white border-top-transparent h-4 w-4"></div> Đang gửi...`;
    setTimeout(() => {
        DATA.tenantApplications.push({ id: `app-${Date.now()}`, name, admin, opManager, treasury, minStakeEth: minStake, note, submittedAt: TODAY });
        renderApplyTenant();
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Gửi Yêu Cầu Đăng Ký`;
        showToast("Thành công", "Đã gửi yêu cầu, chờ Protocol Admin xét duyệt.");
    }, 800);
}

// ================= RECOVERY BY DELEGATE (operator) =================
function renderRecovery() {
    const myId = me()?.id;
    const lost = myId ? DATA.operators.find(o => o.recoveryDelegateId === myId && !o.isActive && !o.recovered) : null;
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
        const operator = me();
        // Mirrors RecoveryLib.recoverOperatorByDelegate: stake + metadata migrate, but
        // isActive carries over as-is from the lost operator — which is always false here
        // (recovery requires the lost operator to already be inactive). Tenant's Operator
        // Manager still has to re-activate via HR, same as the real contract flow.
        operator.tenantId = lost.tenantId;
        operator.stakeEth = lost.stakeEth;
        operator.isActive = false;
        operator.bio = lost.bio || null;
        operator.recoveryDelegateId = null;
        lost.recovered = true;
        const lostTenant = DATA.tenants.find(t => t.id === lost.tenantId);
        DATA.recoveryAliases.push({ currentOperatorId: me().id, rootAddress: operatorId, tenantName: lostTenant.name, recoveredAt: TODAY, reason: 'Tự khôi phục qua ví dự phòng' });
        document.getElementById('recovery-action-area').classList.add('hidden');
        document.getElementById('recovery-success-area').classList.remove('hidden');
        showToast("Thành công", "Đã nhận cọc & hồ sơ. Tài khoản vẫn cần Operator Manager kích hoạt lại trước khi ký được.");
    }, 1200);
}

// ================= HR (tenant) =================
function renderHr() {
    const rows = DATA.operators.filter(o => o.tenantId === myTenant().id && !o.recovered);
    document.getElementById('hr-table-body').innerHTML = rows.map(op => `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="p-4"><p class="font-bold text-slate-800 text-sm">${op.name}</p>${op.flaggedNote ? `<p class="text-xs text-amber-600">${op.flaggedNote}</p>` : ''}</td>
            <td class="p-4 text-sm font-bold text-slate-700">${fmtEth(op.stakeEth)} ETH</td>
            <td class="p-4"><button onclick="toggleHrActive('${op.id}')" class="${op.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} px-3 py-1 rounded text-xs font-bold">${op.isActive ? 'HOẠT ĐỘNG' : 'BẬT HĐ'}</button></td>
        </tr>`).join('');
}

function toggleHrActive(operatorId) {
    const op = DATA.operators.find(o => o.id === operatorId);
    if (!op.isActive && !op.stakeEth) { showToast("Lỗi", "Ví này chưa từng đặt cọc — không có gì để kích hoạt.", "red"); return; }
    op.isActive = !op.isActive;
    if (op.isActive) op.flaggedNote = null;
    renderHr();
    showToast("Thành công", op.isActive ? "Đã kích hoạt." : "Đã tạm ngưng hoạt động.");
}

// ================= SLASH (tenant) =================
function renderSlash() {
    const rows = DATA.operators.filter(o => o.tenantId === myTenant().id && o.isActive);
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
            <td class="p-3 text-center"><input type="checkbox" id="policy-enabled-${p.docType}" ${p.enabled ? 'checked' : ''} onchange="toggleCoSignPolicyRow(${p.docType}, this.checked)" class="w-4 h-4"></td>
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

// Toggling "Bật Đồng Ký" must NOT re-render the whole table from DATA (DATA.enabled is still
// stale until Cập Nhật Chuỗi is clicked) — a full renderConfig() would snap this checkbox
// straight back to unchecked and also discard any unsaved edits in other policy rows.
function toggleCoSignPolicyRow(docType, enabled) {
    const minSigners = document.getElementById(`policy-minsigners-${docType}`);
    const minStake = document.getElementById(`policy-minstake-${docType}`);
    [minSigners, minStake].forEach(el => {
        el.disabled = !enabled;
        el.classList.toggle('bg-slate-100', !enabled);
        el.classList.toggle('border-slate-200', !enabled);
        el.classList.toggle('border-slate-300', enabled);
    });
    document.querySelectorAll(`[id^="policy-role-${docType}-"]`).forEach(cb => {
        cb.disabled = !enabled;
        cb.closest('label').classList.toggle('text-slate-300', !enabled);
        cb.closest('label').classList.toggle('text-slate-600', enabled);
    });
}

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
    const rows = DATA.operators.filter(o => o.tenantId === myTenant().id && !o.recovered);
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
    const docs = DATA.documents.filter(d => d.tenantId === myTenant().id);
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
    const apps = DATA.tenantApplications;
    document.getElementById('tenant-applications-list').innerHTML = apps.length
        ? apps.map(a => `
            <div class="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                    <p class="font-bold text-slate-800">${a.name}</p>
                    <p class="text-xs text-slate-500 font-mono mt-1">Admin: ${a.admin} · QL Vận hành: ${a.opManager} · Treasury: ${a.treasury}</p>
                    <p class="text-xs text-slate-500 mt-1">Đề xuất cọc tối thiểu: ${fmtEth(a.minStakeEth)} ETH</p>
                    ${a.note ? `<p class="text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg p-2">${a.note}</p>` : ''}
                </div>
                <div class="flex gap-2 shrink-0">
                    <button onclick="approveApplication('${a.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold"><i class="fa-solid fa-check"></i> Duyệt</button>
                    <button onclick="rejectApplication('${a.id}')" class="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold">Từ chối</button>
                </div>
            </div>`).join('')
        : `<div class="p-8 text-center text-slate-400 text-sm">Không có yêu cầu nào đang chờ.</div>`;

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

function slugify(name) {
    return (name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || `tenant-${Date.now()}`;
}

function validateNewTenant({ id, name, admin, opManager, treasury, minStake, cooldown }) {
    if (!id || !name || !admin || !opManager || !treasury) return 'Điền đủ thông tin bắt buộc.';
    if (DATA.tenants.some(t => t.id === id)) return 'Mã tổ chức đã tồn tại.';
    if (admin === opManager || admin === treasury || opManager === treasury) return '3 vai trò (Admin/QL vận hành/Treasury) phải là 3 địa chỉ khác nhau.';
    if (!minStake || minStake <= 0) return 'Mức cọc tối thiểu phải > 0.';
    if (!cooldown || cooldown <= 0) return 'Thời gian chờ rút cọc phải > 0.';
    return null;
}

function createTenant() {
    const id = document.getElementById('new-tenant-id').value.trim();
    const name = document.getElementById('new-tenant-name').value.trim();
    const admin = document.getElementById('new-tenant-admin').value.trim();
    const opManager = document.getElementById('new-tenant-opmanager').value.trim();
    const treasury = document.getElementById('new-tenant-treasury').value.trim();
    const minStake = Number(document.getElementById('new-tenant-minstake').value);
    const cooldown = Number(document.getElementById('new-tenant-cooldown').value);

    const error = validateNewTenant({ id, name, admin, opManager, treasury, minStake, cooldown });
    if (error) { showToast("Lỗi", error, "red"); return; }

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

function approveApplication(appId) {
    const app = DATA.tenantApplications.find(a => a.id === appId);
    if (!app) return;
    const id = slugify(app.name);
    const error = validateNewTenant({ id, name: app.name, admin: app.admin, opManager: app.opManager, treasury: app.treasury, minStake: app.minStakeEth, cooldown: 24 });
    if (error) { showToast("Lỗi", `Không thể duyệt: ${error}`, "red"); return; }

    DATA.tenants.push({ id, name: app.name, admin: app.admin, operatorManager: app.opManager, treasury: app.treasury, isActive: true, minStakeEth: app.minStakeEth, unstakeCooldownHours: 24, stakeTotalEth: 0 });
    DATA.tenantApplications = DATA.tenantApplications.filter(a => a.id !== appId);
    renderPlatform();
    showToast("Thành công", `Đã duyệt & khởi tạo "${app.name}" trên chuỗi.`);
}

function rejectApplication(appId) {
    const app = DATA.tenantApplications.find(a => a.id === appId);
    DATA.tenantApplications = DATA.tenantApplications.filter(a => a.id !== appId);
    renderPlatform();
    showToast("Đã từ chối", `Yêu cầu của "${app.name}" đã bị từ chối.`, "amber");
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
    const stranded = DATA.operators.filter(o => o.tenantId === myTenant().id && !o.isActive && !o.recoveryDelegateId && !o.recovered);
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
