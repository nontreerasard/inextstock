const API_BASE_URL = '/.netlify/functions/api';

document.addEventListener('DOMContentLoaded', function() {
    // ลำดับการโหลดที่ถูกต้อง
    loadEquipmentSummary();
    if (document.getElementById('searchInput')) {
        setupSearch();
    }
});

async function loadProducts() {
    try {
        const response = await fetch('http://localhost:3000/api/equipment');
        const data = await response.json();
        updateTable(data);
        updateStats(data);
    } catch (error) {
        showError('ไม่สามารถโหลดข้อมูลได้');
    }
}

function updateTable(data) {
    const tbody = document.querySelector('#productTable tbody');
    const rows = [];
    
    // แปลงข้อมูลจาก object เป็น array แบบแบน
    Object.entries(data).forEach(([category, items]) => {
        items.forEach(item => {
            rows.push({
                category: category,
                model: item.name,
                total: item.total,
                borrowed: item.borrowed,
                available: item.total - item.borrowed
            });
        });
    });

    tbody.innerHTML = rows.map(item => `
        <tr>
            <td>${item.model}</td>
            <td>${item.category}</td>
            <td>${item.total}</td>
            <td>${item.borrowed}</td>
            <td>${item.available}</td>
            <td class="status-cell">
                <span class="status ${item.borrowed === item.total ? 'status-borrowed' : 'status-available'}">
                    ${item.borrowed === item.total ? 'ยืมหมด' : 'มีว่าง'}
                </span>
            </td>
            <td class="action-cell">
                <button class="view-btn" onclick="viewDetails('${item.model}')">
                    ดูรายละเอียด
                </button>
            </td>
        </tr>
    `).join('');

    document.getElementById('noResults').style.display = rows.length ? 'none' : 'block';
}

function updateStats(data) {
    let totalItems = 0;
    let totalBorrowed = 0;

    Object.values(data).forEach(category => {
        category.forEach(item => {
            totalItems += item.total;
            totalBorrowed += item.borrowed;
        });
    });

    const statsContainer = document.getElementById('stockStats');
    statsContainer.innerHTML = `
        <div class="stats-container">
            <div class="stat-item">
                <div class="stat-label">อุปกรณ์ทั้งหมด</div>
                <div class="stat-value">${totalItems} ชิ้น</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">ถูกยืมไป</div>
                <div class="stat-value">${totalBorrowed} ชิ้น</div>
            </div>
        </div>
    `;
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return; // เพิ่มการตรวจสอบ

    searchInput.addEventListener('input', async function() {
        const searchTerm = this.value.toLowerCase();
        try {
            const response = await fetch('http://localhost:3000/api/equipment/summary');
            const data = await response.json();
            
            const filteredData = {};
            Object.entries(data).forEach(([category, models]) => {
                const filteredModels = models.filter(model => 
                    model.model.toLowerCase().includes(searchTerm) ||
                    category.toLowerCase().includes(searchTerm)
                );
                if (filteredModels.length > 0) {
                    filteredData[category] = filteredModels;
                }
            });
            
            displaySummary(filteredData);
        } catch (error) {
            console.error('Error:', error);
            showError('ไม่สามารถค้นหาข้อมูลได้');
        }
    });

    // เพิ่มตัวกรองตาม status (ว่าง/ไม่ว่าง)
    searchInput.addEventListener('change', function() {
        const status = this.value;
        displaySummary(filterByStatus(data, status));
    });
}

function showError(message) {
    const tbody = document.querySelector('#productTable tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="error-message">
                ${message}
                <button onclick="loadProducts()" class="retry-btn">ลองใหม่</button>
            </td>
        </tr>
    `;
}

function viewDetails(model) {
    alert(`กำลังพัฒนาระบบดูรายละเอียดของ ${model}`);
}

async function loadEquipmentSummary() {
    try {
        const response = await fetch(`${API_BASE_URL}/equipment`);
        const data = await response.json();
        
        console.log('Received data:', data);
        
        if (!data || Object.keys(data).length === 0) {
            throw new Error('ไม่พบข้อมูล');
        }
        
        // อัพเดทสถิติรวม
        updateTotalStats(data);
        // แสดงข้อมูลแต่ละหมวดหมู่
        displaySummary(data);
    } catch (error) {
        console.error('Error:', error);
        showError('ไม่สามารถโหลดข้อมูลได้: ' + error.message);
    }
}

function updateTotalStats(data) {
    let totalAll = 0;
    let borrowedAll = 0;

    Object.values(data).forEach(models => {
        models.forEach(model => {
            totalAll += model.total;
            borrowedAll += model.borrowed;
        });
    });

    const statsContainer = document.getElementById('stockStats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stats-container">
                <div class="stat-item">
                    <div class="stat-label">อุปกรณ์ทั้งหมด</div>
                    <div class="stat-value-all">${totalAll} ชิ้น</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">ถูกยืมไป</div>
                    <div class="stat-value-borrowed">${borrowedAll} ชิ้น</div>
                </div>
            </div>
        `;
    }
}

// ปรับปรุงฟังก์ชัน displaySummary
function displaySummary(data) {
    const container = document.querySelector('.category-grid');
    if (!container) return;

    try {
        console.log('Rendering data:', data);
        
        const html = Object.entries(data)
            .filter(([category, models]) => category && Array.isArray(models))
            .map(([category, models]) => {
                const categoryTotal = models.reduce((sum, model) => sum + (model?.total || 0), 0);
                const categoryBorrowed = models.reduce((sum, model) => sum + (model?.borrowed || 0), 0);

                const modelsList = models
                    .filter(model => model && model.model) // กรองค่า null/undefined
                    .map(model => `
                        <div class="model-item">
                            <div class="model-stats-container">
                                <div class="model-name">${model.model}</div>
                                <div class="model-stat total">ทั้งหมด: ${model.total || 0}</div>
                                <div class="model-stat borrowed">ยืม: ${model.borrowed || 0}</div>
                                <div class="model-stat available">ว่าง: ${(model.total || 0) - (model.borrowed || 0)}</div>
                            </div>
                            <button class="view-details-btn" onclick="viewModelDetails('${model.model}')">
                                ดูรายละเอียด
                            </button>
                        </div>
                    `)
                    .join('');

                return `
                    <div class="category-card">
                        <h2 class="category-title">${category}</h2>
                        <div class="category-stats">
                            <div>รวมทั้งหมด: ${categoryTotal}</div>
                            <div>ยืม: ${categoryBorrowed}</div>
                            <div>ว่าง: ${categoryTotal - categoryBorrowed}</div>
                        </div>
                        <div class="model-list">
                            ${modelsList}
                        </div>
                    </div>
                `;
            })
            .join('');

        container.innerHTML = html || '<div class="no-data">ไม่พบข้อมูล</div>';
    } catch (error) {
        console.error('Display error:', error);
        container.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการแสดงผล</div>';
    }
}

// แก้ไขฟังก์ชัน viewModelDetails ให้แสดงข้อมูล S/N
async function viewModelDetails(modelName) {
    try {
        // แก้ไข URL path ให้ตรงกับ server.js
        const response = await fetch(`http://localhost:3000/api/equipment/model/${encodeURIComponent(modelName)}`);
        console.log('Fetching details for model:', modelName);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);

        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        const closeBtn = modal.querySelector('.close');
        
        // เพิ่ม event listener สำหรับปุ่มปิด
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        closeBtn.onclick = closeModal;
        window.onclick = (event) => {
            if (event.target === modal) {
                closeModal();
            }
        };

        modalTitle.textContent = `รายการ Serial Number ของ ${modelName}`;
        modalContent.innerHTML = `
            <table class="details-table">
                <thead>
                    <tr>
                        <th>Serial Number</th>
                        <th>สถานะ</th>
                        <th>รหัสผู้ยืม</th>
                        <th>ชื่อผู้ยืม</th>
                        <th>วันที่ยืม</th>
                        <th>กำหนดคืน</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => {
                        const borrowDate = item.borrow_date ? new Date(item.borrow_date).toLocaleDateString('th-TH', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                        }) : '-';
                        
                        const returnDate = item.return_date ? new Date(item.return_date).toLocaleDateString('th-TH', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                        }) : '-';

                        return `
                            <tr>
                                <td>${item.serial_number || '-'}</td>
                                <td>${item.status || 'ว่าง'}</td>
                                <td>${item.borrower_id || '-'}</td>
                                <td>${item.borrower_name || '-'}</td>
                                <td>${borrowDate}</td>
                                <td>${returnDate}</td>
                                <td class="action-buttons">
                                    ${item.borrower_id ? 
                                        `<button class="return-btn" onclick="handleReturn('${item.serial_number}')">คืน</button>` :
                                        `<button class="borrow-btn" onclick="handleBorrow('${item.serial_number}')">ยืม</button>`
                                    }
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        modal.style.display = 'block';

        // เพิ่ม event listener สำหรับการค้นหา
        const searchInput = document.getElementById('modalSearch');
        const originalData = [...data]; // เก็บข้อมูลต้นฉบับ

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredData = originalData.filter(item => 
                item.serial_number?.toLowerCase().includes(searchTerm) ||
                item.borrower_name?.toLowerCase().includes(searchTerm) ||
                item.borrower_id?.toLowerCase().includes(searchTerm)
            );
            updateModalTable(filteredData);
        });

        // แสดงข้อมูลครั้งแรก
        updateModalTable(data);
    } catch (error) {
        console.error('Error in viewModelDetails:', error);
        alert('ไม่สามารถโหลดรายละเอียดได้: ' + error.message);
    }
}

function updateModalTable(data) {
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = `
        <table class="details-table">
            <thead>
                <tr>
                    <th>Serial Number</th>
                    <th>สถานะ</th>
                    <th>รหัสผู้ยืม</th>
                    <th>ชื่อผู้ยืม</th>
                    <th>วันที่ยืม</th>
                    <th>กำหนดคืน</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => {
                    // แปลงรูปแบบวันที่
                    const borrowDate = item.borrow_date ? new Date(item.borrow_date).toLocaleDateString('th-TH', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                    }) : '-';
                    
                    const returnDate = item.return_date ? new Date(item.return_date).toLocaleDateString('th-TH', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                    }) : '-';

                    return `
                        <tr>
                            <td>${item.serial_number || '-'}</td>
                            <td>${item.status || 'ว่าง'}</td>
                            <td>${item.borrower_id || '-'}</td>
                            <td>${item.borrower_name || '-'}</td>
                            <td>${borrowDate}</td>
                            <td>${returnDate}</td>
                            <td class="action-buttons">
                                ${item.borrower_id ? 
                                    `<button class="return-btn" onclick="handleReturn('${item.serial_number}')">คืน</button>` :
                                    `<button class="borrow-btn" onclick="handleBorrow('${item.serial_number}')">ยืม</button>`
                                }
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// เพิ่มฟังก์ชันสำหรับจัดการการยืม-คืน
function showBorrowModal(serialNumber) {
    const modal = document.getElementById('borrowModal');
    const form = document.getElementById('borrowForm');
    const serialInput = document.getElementById('serialNumber');
    const borrowDateInput = document.getElementById('borrowDate');
    const returnDateInput = document.getElementById('returnDate');

    // ตั้งค่าวันที่เริ่มต้น
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    serialInput.value = serialNumber;
    borrowDateInput.value = today;
    returnDateInput.value = nextWeek.toISOString().split('T')[0];
    
    modal.style.display = 'block';
    
    // จัดการการ submit form
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const borrowData = {
            serial_number: serialNumber,
            borrower_id: document.getElementById('borrowerId').value.trim(),
            borrower_name: document.getElementById('borrowerName').value.trim(),
            borrow_date: document.getElementById('borrowDate').value,
            return_date: document.getElementById('returnDate').value
        };

        try {
            // เพิ่มการตรวจสอบข้อมูล
            if (!borrowData.borrower_id || !borrowData.borrower_name) {
                throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
            }
            
            validateDates(borrowData.borrow_date, borrowData.return_date);

            const response = await fetch('http://localhost:3000/api/equipment/borrow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(borrowData)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'ไม่สามารถบันทึกการยืมได้');
            }

            alert(data.message);
            closeBorrowModal();
            
            // รีโหลดข้อมูลในตาราง
            const modelName = document.getElementById('modalTitle')
                .textContent.replace('รายการ Serial Number ของ ', '');
            viewModelDetails(modelName);

        } catch (error) {
            alert(error.message);
            return;
        }
    };
}

function closeBorrowModal() {
    const modal = document.getElementById('borrowModal');
    const form = document.getElementById('borrowForm');
    form.reset();
    modal.style.display = 'none';
}

// แก้ไขฟังก์ชัน handleBorrow เดิม
async function handleBorrow(serialNumber) {
    showBorrowModal(serialNumber);
}

async function handleReturn(serialNumber) {
    try {
        if (!confirm('ยืนยันการคืนอุปกรณ์?')) return;

        const response = await fetch('http://localhost:3000/api/equipment/return', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                serial_number: serialNumber
            }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'ไม่สามารถบันทึกการคืนได้');
        }

        alert(data.message);
        // รีโหลดข้อมูลในตาราง
        const modelName = document.getElementById('modalTitle').textContent.replace('รายการ Serial Number ของ ', '');
        viewModelDetails(modelName);

    } catch (error) {
        console.error('Return error:', error);
        alert(error.message);
    }
}

// ลบฟังก์ชันที่ซ้ำซ้อนออก
// ลบ viewCategoryDetails ที่ไม่ได้ใช้

// ลบ Event Listeners เดิมที่ซ้ำซ้อน
// เพิ่ม Event Listener สำหรับปิด Modal
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('detailModal').style.display = 'none';
});

window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// เพิ่มการตรวจสอบวันที่
function validateDates(borrowDate, returnDate) {
    const bDate = new Date(borrowDate);
    const rDate = new Date(returnDate);
    const today = new Date();
    
    // รีเซ็ตเวลาเป็นเที่ยงคืนเพื่อเปรียบเทียบเฉพาะวัน
    today.setHours(0, 0, 0, 0);
    bDate.setHours(0, 0, 0, 0);
    rDate.setHours(0, 0, 0, 0);
    
    if (bDate < today) {
        throw new Error('ไม่สามารถยืมย้อนหลังได้');
    }
    if (rDate <= bDate) {
        throw new Error('วันที่คืนต้องมากกว่าวันที่ยืม');
    }
}

// เพิ่มการรีเฟรชข้อมูลหลังจากการยืม-คืน
async function refreshData() {
    await loadEquipmentSummary();
    const modelName = document.getElementById('modalTitle')
        .textContent.replace('รายการ Serial Number ของ ', '');
    await viewModelDetails(modelName);
}