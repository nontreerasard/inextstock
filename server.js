const express = require('express');
const cors = require('cors');
const path = require('path');
const connection = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// หน้าแรก
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'first.html'));
});

// API endpoint สำหรับดึงข้อมูลสรุป
app.get('/api/equipment/summary', async (req, res) => {
    try {
        const [results] = await connection.query(`
            SELECT 
                sheet_name,
                COUNT(*) as total,
                SUM(CASE WHEN borrower_id IS NOT NULL THEN 1 ELSE 0 END) as borrowed
            FROM products
            GROUP BY sheet_name
            ORDER BY sheet_name
        `);

        // กำหนดกฎการจัดกลุ่มที่แม่นยำ
        const deviceRules = { 
            'CISCO ISR': (name) => /^ISR\d{4}|ISR-\d{4}|ISR [34]\d{3}/.test(name),
            'FortiGate': (name) => /^FG-|FORTIGATE|FORTINET/.test(name),
            'CISCO Switch': (name) => /^WS-C|^CATALYST/.test(name),  // ลบ ^C[23]\d{3} ออก
            'IP Phone': (name) => /^SIP-|^CP-|IP PHONE/.test(name),
            'VEGA': (name) => /^VEGA/.test(name),
            'CISCO Router': (name) => /CISCO.*\d{4}|^[12]\d{3}/.test(name),
            'AP': (name) => /AP/.test(name),
            'RED': (name) => /RED/.test(name),
            'HUAWEI': (name) => /AR/.test(name),
            'RouterBoard': (name) => /RB/.test(name),
            'Juniper SRX': (name) => /^SRX|SRX\d{3}/.test(name),
            'DrayTek': (name) => /VIGOR|^VIGOR/.test(name)
        };

        const groupedData = {};
        
        results.forEach(item => {
            const name = item.sheet_name.toUpperCase();
            let category = "อื่นๆ";

            // ตรวจสอบตามกฎที่กำหนด
            for (const [groupName, rule] of Object.entries(deviceRules)) {
                if (rule(name)) {
                    category = groupName;
                    break;
                }
            }

            // สร้างกลุ่มถ้ายังไม่มี
            if (!groupedData[category]) {
                groupedData[category] = [];
            }

            // เพิ่มข้อมูลในกลุ่ม
            groupedData[category].push({
                model: item.sheet_name,
                total: parseInt(item.total),
                borrowed: parseInt(item.borrowed),
                available: item.total - item.borrowed
            });

            console.log(`Categorized ${item.sheet_name} as ${category}`); // Debug log
        });

        // จัดเรียงกลุ่มตามที่ต้องการ
        const orderedCategories = {
            "CISCO Router": groupedData["CISCO Router"] || [],
            "CISCO Switch": groupedData["CISCO Switch"] || [],
            "CISCO ISR": groupedData["CISCO ISR"] || [],
            "FortiGate": groupedData["FortiGate"] || [],
            "IP Phone": groupedData["IP Phone"] || [],
            "VEGA": groupedData["VEGA"] || [],
            "AP": groupedData["AP"] || [],
            "RED": groupedData["RED"] || [],
            "HUAWEI": groupedData["HUAWEI"] || [],
            "RouterBoard": groupedData["RouterBoard"] || [],
            "Juniper SRX": groupedData["Juniper SRX"] || [],
            "DrayTek": groupedData["DrayTek"] || [],
            "อื่นๆ": groupedData["อื่นๆ"] || []
        };

        res.json(orderedCategories);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint สำหรับดึงข้อมูล serial number
app.get('/api/equipment/model/:modelName', async (req, res) => {
    try {
        console.log('Searching for model:', req.params.modelName); // เพิ่ม log

        const [results] = await connection.query(`
            SELECT 
                serial_number,
                status,
                borrower_id,
                borrower_name,
                borrow_date,
                return_date
            FROM products
            WHERE sheet_name LIKE ? OR model LIKE ?
            ORDER BY serial_number
        `, [`%${req.params.modelName}%`, `%${req.params.modelName}%`]); // ใช้ LIKE แทน =
        
        console.log('Query results:', results); // เพิ่ม log

        if (!results?.length) {
            console.log('No data found'); // เพิ่ม log
            return res.status(404).json({
                error: 'No data',
                message: `ไม่พบข้อมูลสำหรับรุ่น ${req.params.modelName}`
            });
        }
        
        // แปลงข้อมูลให้เหมาะสม
        const formattedResults = results.map(item => ({
            serial_number: item.serial_number || '',
            status: item.status || 'available',
            borrower_id: item.borrower_id || '',
            borrower_name: item.borrower_name || '',
            borrow_date: item.borrow_date || null,
            return_date: item.return_date || null
        }));

        console.log('Sending formatted results:', formattedResults); // เพิ่ม log
        res.json(formattedResults);
    } catch (error) {
        console.error('Database error:', error);
        res.status(503).json({
            error: 'Database error',
            message: 'ไม่สามารถดึงข้อมูลได้'
        });
    }
});

// แก้ไข API endpoint สำหรับการยืม
app.post('/api/equipment/borrow', async (req, res) => {
    try {
        const { serial_number, borrower_id, borrower_name, borrow_date, return_date } = req.body;
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!serial_number || !borrower_id || !borrower_name || !borrow_date || !return_date) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        // แก้ไขการตรวจสอบสถานะในการยืม
        const [checkResult] = await connection.query(
            'SELECT status FROM products WHERE serial_number = ? AND status = ?',
            [serial_number, 'ว่าง']
        );

        if (!checkResult[0]) {
            return res.status(400).json({
                error: 'Not available',
                message: 'อุปกรณ์นี้ไม่สามารถยืมได้'
            });
        }

        // อัพเดทข้อมูลการยืมในตาราง products
        await connection.query(
            `UPDATE products 
             SET borrower_id = ?,
                 borrower_name = ?,
                 borrow_date = ?,
                 return_date = ?,
                 status = 'ถูกยืม'
             WHERE serial_number = ?`,
            [borrower_id, borrower_name, borrow_date, return_date, serial_number]
        );

        res.json({
            success: true,
            message: 'บันทึกการยืมเรียบร้อย'
        });

    } catch (error) {
        console.error('Borrow error:', error);
        res.status(500).json({
            error: 'Database error',
            message: 'ไม่สามารถบันทึกข้อมูลการยืมได้'
        });
    }
});

// แก้ไข API endpoint สำหรับการคืน
app.post('/api/equipment/return', async (req, res) => {
    try {
        const { serial_number } = req.body;
        
        if (!serial_number) {
            return res.status(400).json({
                error: 'Missing serial number',
                message: 'กรุณาระบุ Serial Number'
            });
        }

        // ตรวจสอบสถานะปัจจุบัน
        const [checkResult] = await connection.query(
            'SELECT status FROM products WHERE serial_number = ?',
            [serial_number]
        );

        if (!checkResult[0] || checkResult[0].status !== 'ถูกยืม') {
            return res.status(400).json({
                error: 'Not borrowed',
                message: 'อุปกรณ์นี้ไม่ได้ถูกยืม'
            });
        }

        // รีเซ็ตข้อมูลการยืมในตาราง products
        await connection.query(
            `UPDATE products 
             SET borrower_id = NULL,
                 borrower_name = NULL,
                 borrow_date = NULL,
                 return_date = NULL,
                 status = 'ว่าง'
             WHERE serial_number = ?`,
            [serial_number]
        );

        res.json({
            success: true,
            message: 'บันทึกการคืนเรียบร้อย'
        });

    } catch (error) {
        console.error('Return error:', error);
        res.status(500).json({
            error: 'Database error',
            message: 'ไม่สามารถบันทึกข้อมูลการคืนได้'
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));