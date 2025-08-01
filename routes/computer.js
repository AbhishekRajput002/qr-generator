const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

module.exports = (db) => {
  const router = express.Router();

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

    // Add computer route
  router.post('/add-computer', async (req, res) => {
    const { cpu, ram, storage, gpu, os, serial_number } = req.body;
    
    // Simple validation
    if (!cpu || !serial_number) {
      return res.status(400).send('CPU and Serial Number are required');
    }
    
    try {
      // Create computer data object
      const computerData = {
        device: "Computer Specifications",
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
        'INSERT INTO computers (cpu, ram, storage, gpu, os, serial_number, qr_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [cpu, ram, storage, gpu, os, serial_number, jsonData]
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
  });router.get('/computer/:id', async (req, res) => {
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

  // Download QR
router.get('/download-qr/:id', async (req, res) => {
  try {
    const detailsUrl = `${req.protocol}://${req.get('host')}/computer/${req.params.id}`;
    const qrImageBuffer = await qrcode.toBuffer(detailsUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 4,
      scale: 10
    });
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="computer-specs-${req.params.id}.png"`);
    res.send(qrImageBuffer);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('QR download failed');
  }
}); 

  return router;
};