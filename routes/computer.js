const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

module.exports = (db) => {
  const router = express.Router();

  // Simple session management for admin login
  const adminSessions = new Set();

  // Middleware to check if user is logged in as admin
  const requireAdminAuth = (req, res, next) => {
    const sessionId = req.cookies?.adminSession;
    if (!sessionId || !adminSessions.has(sessionId)) {
      return res.redirect('/admin/login');
    }
    next();
  };

    // Configure paths
 
  
  // Helper function to get base URL
   const getBaseUrl = (req) => {
    return `${req.protocol}://${req.get('host')}`;
  }; 

    const qrDir = path.join(__dirname, '../public/qr');
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }

  // Homepage with form
  router.get('/', (req, res) => {
    res.render('index');
  });

  // Admin login page
  router.get('/admin/login', (req, res) => {
    res.render('admin-login', { error: null });
  });

  // Admin login POST
  router.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin') {
      // Generate session ID
      const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      adminSessions.add(sessionId);
      
      // Set cookie
      res.cookie('adminSession', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.redirect('/admin');
    } else {
      res.render('admin-login', { error: 'Invalid username or password' });
    }
  });

  // Admin logout
  router.get('/admin/logout', (req, res) => {
    const sessionId = req.cookies?.adminSession;
    if (sessionId) {
      adminSessions.delete(sessionId);
    }
    res.clearCookie('adminSession');
    res.redirect('/admin/login');
  });

  // Admin dashboard (protected)
  router.get('/admin', requireAdminAuth, async (req, res) => {
    try {
      // Get total computers count
      const [totalRows] = await db.promise().execute('SELECT COUNT(*) as total FROM computers');
      const totalComputers = totalRows[0].total;

      // Get computers added today
      const today = new Date().toISOString().split('T')[0];
      const [todayRows] = await db.promise().execute(
        'SELECT COUNT(*) as today FROM computers WHERE DATE(created_at) = ?',
        [today]
      );
      const todayAdded = todayRows[0].today;

      // Get recent computers
      const [recentRows] = await db.promise().execute(
        'SELECT * FROM computers ORDER BY created_at DESC LIMIT 5'
      );

      // Get department statistics
      const [deptRows] = await db.promise().execute(
        'SELECT department, COUNT(*) as count FROM computers WHERE department IS NOT NULL AND department != "" GROUP BY department ORDER BY count DESC'
      );
      
      const departmentStats = {};
      deptRows.forEach(row => {
        departmentStats[row.department] = row.count;
      });

      // Calculate server uptime (mock data for now)
      const serverUptime = '2 days, 14 hours';
      const lastBackup = new Date().toLocaleDateString();
      const storageUsed = '45.2 MB';

      res.render('admin', {
        totalComputers,
        totalQRGenerated: totalComputers, // Same as total computers
        todayAdded,
        systemStatus: 'Online',
        recentComputers: recentRows,
        departmentStats,
        serverUptime,
        lastBackup,
        storageUsed
      });
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
      res.status(500).send('Database error');
    }
  });

  // Admin add computer page (protected)
  router.get('/admin/add-computer', requireAdminAuth, (req, res) => {
    res.render('admin-add-computer');
  });

  // Admin add computer POST (protected)
  router.post('/admin/add-computer', requireAdminAuth, async (req, res) => {
    const { 
      cpu, ram, storage, gpu, os, serial_number, 
      computer_name, department, location, ip_address, mac_address, 
      purchase_date, warranty_expiry, notes 
    } = req.body;
    
    // Simple validation
    if (!cpu || !serial_number || !ram || !storage || !os) {
      return res.status(400).send('Required fields are missing');
    }
    
    try {
      // Create computer data object with additional fields
      const computerData = {
        device: "Computer Specifications",
        computer_name: computer_name || `Computer ${serial_number}`,
        department: department || 'Not specified',
        location: location || 'Not specified',
        cpu,
        ram,
        storage,
        gpu: gpu || 'Integrated',
        os,
        serial_number,
        ip_address: ip_address || 'Not specified',
        mac_address: mac_address || 'Not specified',
        purchase_date: purchase_date || 'Not specified',
        warranty_expiry: warranty_expiry || 'Not specified',
        notes: notes || '',
        timestamp: new Date().toISOString()
      };
      
      // Convert to JSON string with proper formatting
      const jsonData = JSON.stringify(computerData, null, 2);
      
      // Generate QR code directly from JSON data
      const qrImage = await qrcode.toDataURL(jsonData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 4,
        scale: 10
      });
      
      // Insert into database with additional fields
      await db.promise().execute(
        `INSERT INTO computers (
          cpu, ram, storage, gpu, os, serial_number, qr_data,
          computer_name, department, location, ip_address, mac_address,
          purchase_date, warranty_expiry, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cpu, ram, storage, gpu || 'Integrated', os, serial_number, jsonData,
          computer_name || `Computer ${serial_number}`, department || 'Not specified',
          location || 'Not specified', ip_address || 'Not specified', mac_address || 'Not specified',
          purchase_date || null, warranty_expiry || null, notes || ''
        ]
      );
      
      // Redirect to admin dashboard with success message
      res.redirect('/admin?success=computer_added');
      
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send(`Server Error: ${err.message}`);
    }
  });

  // Admin manage computers page
  router.get('/admin/computers', requireAdminAuth, async (req, res) => {
    try {
      const [rows] = await db.promise().execute(
        'SELECT * FROM computers ORDER BY created_at DESC'
      );
      
      res.render('admin-computers', { computers: rows });
    } catch (err) {
      console.error('Error fetching computers:', err);
      res.status(500).send('Database error');
    }
  });

  // Admin computers by department page
  router.get('/admin/computers-by-department', requireAdminAuth, async (req, res) => {
    try {
      // Get all departments with computer counts
      const [deptRows] = await db.promise().execute(
        'SELECT department, COUNT(*) as count FROM computers WHERE department IS NOT NULL AND department != "" GROUP BY department ORDER BY count DESC'
      );
      
      // Get all computers grouped by department
      const [allComputers] = await db.promise().execute(
        'SELECT * FROM computers WHERE department IS NOT NULL AND department != "" ORDER BY department, created_at DESC'
      );
      
      // Group computers by department
      const computersByDepartment = {};
      allComputers.forEach(computer => {
        if (!computersByDepartment[computer.department]) {
          computersByDepartment[computer.department] = [];
        }
        computersByDepartment[computer.department].push(computer);
      });
      
      res.render('admin-computers-by-department', { 
        departments: deptRows,
        computersByDepartment
      });
    } catch (err) {
      console.error('Error fetching computers by department:', err);
      res.status(500).send('Database error');
    }
  });

  // Admin computers by specific department page
  router.get('/admin/computers-by-department/:department', requireAdminAuth, async (req, res) => {
    try {
      const department = decodeURIComponent(req.params.department);
      
      const [rows] = await db.promise().execute(
        'SELECT * FROM computers WHERE department = ? ORDER BY created_at DESC',
        [department]
      );
      
      res.render('admin-computers', { 
        computers: rows,
        departmentFilter: department
      });
    } catch (err) {
      console.error('Error fetching computers for department:', err);
      res.status(500).send('Database error');
    }
  });

  // Delete computer route
  router.delete('/admin/computer/:id/delete', requireAdminAuth, async (req, res) => {
    try {
      const computerId = req.params.id;
      
      // Check if computer exists
      const [rows] = await db.promise().execute(
        'SELECT * FROM computers WHERE id = ?',
        [computerId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Computer not found' });
      }
      
      // Delete the computer
      await db.promise().execute(
        'DELETE FROM computers WHERE id = ?',
        [computerId]
      );
      
      res.json({ success: true, message: 'Computer deleted successfully' });
    } catch (err) {
      console.error('Error deleting computer:', err);
      res.status(500).json({ success: false, message: 'Database error' });
    }
  });

    // Add computer route
  router.post('/add-computer', async (req, res) => {
    const { cpu, ram, storage, gpu, os, serial_number, computer_name, department, location } = req.body;
    
    // Simple validation
    if (!cpu || !serial_number) {
      return res.status(400).send('CPU and Serial Number are required');
    }
    
    try {
      // Create computer data object
      const computerData = {
        device: "Computer Specifications",
        computer_name: computer_name || `Computer ${serial_number}`,
        department: department || 'Not specified',
        location: location || 'Not specified',
        cpu,
        ram,
        storage,
        gpu,
        os,
        serial_number,
        timestamp: new Date().toISOString()
      };
      
      // Convert to JSON string with proper formatting
      const jsonData = JSON.stringify(computerData, null, 2);
      
      // Generate QR code directly from JSON data
      const qrImage = await qrcode.toDataURL(jsonData, {
        errorCorrectionLevel: 'H', // Highest error correction
        type: 'image/png',
        margin: 4,
        scale: 10
      });
      
      // Insert into database (optional)
      await db.promise().execute(
        'INSERT INTO computers (cpu, ram, storage, gpu, os, serial_number, qr_data, computer_name, department, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [cpu, ram, storage, gpu, os, serial_number, jsonData, computer_name || `Computer ${serial_number}`, department || 'Not specified', location || 'Not specified']
      );
      
      // Render result page with QR and JSON data
      res.render('result', {
        qrImage,
        computerData,
        jsonData // Pass the formatted JSON
      });
      
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send(`Server Error: ${err.message}`);
    }
  });

  // Result page with QR
  router.get('/result/:id', (req, res) => {
    const computerId = req.params.id;
    const baseUrl = getBaseUrl(req);
    const detailsUrl = `${baseUrl}/computer/${computerId}`;
    
    qrcode.toDataURL(detailsUrl, (err, qrData) => {
      if (err) return res.status(500).render('error', { message: 'QR generation failed' });
      
      res.render('result', {
        qrImage: qrData,
        computerId,
        downloadLink: `/download-qr/${computerId}`
      });
    });
  });

  // View all computers route
  router.get('/computers', async (req, res) => {
    try {
      const [rows] = await db.promise().execute(
        'SELECT * FROM computers ORDER BY id DESC'
      );
      
      res.render('computers', { computers: rows });
    } catch (err) {
      console.error('Error fetching computers:', err);
      res.status(500).send('Database error');
    }
  });

  // Computer details page
  router.get('/computer/:id', async (req, res) => {
    try {
      const [rows] = await db.promise().execute(
        'SELECT * FROM computers WHERE id = ?',
        [req.params.id]
      );
      
      if (rows.length === 0) {
        return res.status(404).send('Computer not found');
      }
      
      res.render('details', { computer: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Database error');
    }
  });

  // Generate QR from stored data route
  router.get('/generate-qr/:id', async (req, res) => {
    try {
      const [rows] = await db.promise().execute(
        'SELECT * FROM computers WHERE id = ?',
        [req.params.id]
      );
      
      if (rows.length === 0) {
        return res.status(404).send('Computer not found');
      }
      
      const computer = rows[0];
      
      // Check if qr_data exists
      if (!computer.qr_data) {
        return res.status(400).send('QR data not found for this computer');
      } 
      
      // Generate QR code from the stored qr_data
      const qrImage = await qrcode.toDataURL(computer.qr_data, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 4,
        scale: 10
      });
      
      // Parse the stored JSON data for display
      let computerData;
      try {
        computerData = JSON.parse(computer.qr_data);
      } catch (parseErr) {
        computerData = {
          device: "Computer Specifications",
          cpu: computer.cpu,
          ram: computer.ram,
          storage: computer.storage,
          gpu: computer.gpu,
          os: computer.os,
          serial_number: computer.serial_number,
          timestamp: computer.created_at
        };
      }
      
      // Check if request came from admin panel (check for admin session)
      const sessionId = req.cookies?.adminSession;
      const isFromAdmin = sessionId && adminSessions.has(sessionId);
      
      // Render result page with regenerated QR and original data
      res.render('result', {
        qrImage,
        computerData,
        jsonData: computer.qr_data,
        isRegenerated: true,
        isFromAdmin
      });
      
    } catch (err) {
      console.error('Error generating QR:', err);
      res.status(500).send(`Server Error: ${err.message}`);
    }
  });

  // Download QR
  router.get('/download-qr/:id', (req, res) => {
    const filePath = path.join(qrDir, `computer-${req.params.id}.png`);
    res.download(filePath, `computer-specs-${req.params.id}.png`, (err) => {
      if (err) console.error('Download error:', err);
    });
  });

  // Export computers data as Excel (protected)
  router.get('/admin/export-computers', requireAdminAuth, async (req, res) => {
    console.log('Export route accessed'); // Add logging
    console.log('User session:', req.cookies?.adminSession); // Debug session
    try {
    const [rows] = await db.promise().execute(
      'SELECT * FROM computers ORDER BY created_at DESC'
    );

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Computers');

    // Add header row
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'computer_name', width: 20 },
      { header: 'Serial Number', key: 'serial_number', width: 20 },
      { header: 'CPU', key: 'cpu', width: 20 },
      { header: 'RAM', key: 'ram', width: 15 },
      { header: 'Storage', key: 'storage', width: 15 },
      { header: 'GPU', key: 'gpu', width: 20 },
      { header: 'OS', key: 'os', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'IP Address', key: 'ip_address', width: 20 },
      { header: 'MAC Address', key: 'mac_address', width: 20 },
      { header: 'Purchase Date', key: 'purchase_date', width: 15 },
      { header: 'Warranty Expiry', key: 'warranty_expiry', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Created Date', key: 'created_at', width: 20 }
    ];

    // Add data rows
    rows.forEach(computer => {
      worksheet.addRow({ 
        ...computer,
        created_at: new Date(computer.created_at).toLocaleDateString()
      });
    });

    // Set response headers for Excel file download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=computers_export_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting computers:', err);
    res.status(500).send(`Export error: ${err.message}`);
  }
});



  return router;
};