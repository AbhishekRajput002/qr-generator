# Computer QR Generator - Admin Panel

A comprehensive QR code generation system for computer specifications with an advanced admin panel.

## Features

### Public Features
- **QR Code Generation**: Generate QR codes for computer specifications
- **Computer Database**: View all registered computers
- **Search & Filter**: Search computers by serial number, CPU, or OS
- **Responsive Design**: Works on desktop and mobile devices

### Admin Panel Features
- **Dashboard**: Overview with statistics and recent activity
- **Computer Management**: Add, edit, delete, and view computers
- **Advanced Form**: Enhanced computer specification form with additional fields
- **Export Functionality**: Export computer data to CSV format
- **System Monitoring**: View system status and information

## Admin Panel Access

The admin panel is accessible via the "Admin Panel" link in the navigation menu. It requires authentication with the following credentials:

**Username:** `admin`  
**Password:** `admin`

### Login Process:
1. Click "Admin Panel" from any page
2. Enter username: `admin` and password: `admin`
3. Upon successful login, you'll be redirected to the admin dashboard
4. Use the "Logout" link in the admin navigation to sign out

### Admin Dashboard (`/admin`)
- Total computers count
- QR codes generated
- Computers added today
- System status
- Recent activity feed
- Quick action buttons

### Add Computer (`/admin/add-computer`)
Enhanced form with additional fields:
- **Basic Information**: Serial number, computer name, location
- **Hardware Specs**: CPU, RAM, storage, GPU
- **Software & Network**: OS, IP address, MAC address
- **Additional Info**: Purchase date, warranty expiry, notes

### Manage Computers (`/admin/computers`)
- View all computers with detailed information
- Search and filter functionality
- Edit and delete computers
- Export data to CSV
- Generate QR codes

## Database Schema

The system uses MySQL with the following table structure:

```sql
CREATE TABLE computers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpu VARCHAR(255) NOT NULL,
    ram VARCHAR(255) NOT NULL,
    storage VARCHAR(255) NOT NULL,
    gpu VARCHAR(255) NOT NULL,
    os VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    computer_name VARCHAR(255),
    location VARCHAR(255),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    purchase_date DATE,
    warranty_expiry DATE,
    notes TEXT,
    qr_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up MySQL database using `database.sql`
4. Configure database connection in `app.js`
5. Start the server: `npm start`

## Usage

1. **Public Access**: Visit the main page to add computers and generate QR codes
2. **Admin Access**: Use the admin panel for advanced management features
3. **QR Codes**: Generated QR codes contain all computer specifications in JSON format
4. **Export**: Use the export feature in admin panel to download computer data

## File Structure

```
├── app.js                 # Main application file
├── database.sql          # Database schema
├── package.json          # Dependencies
├── views/               # EJS templates
│   ├── index.ejs        # Public home page
│   ├── computers.ejs    # Public computers view
│   ├── admin.ejs        # Admin dashboard
│   ├── admin-add-computer.ejs  # Admin add computer form
│   ├── admin-computers.ejs     # Admin computers management
│   ├── details.ejs      # Computer details page
│   └── result.ejs       # QR code result page
├── routes/
│   └── computer.js      # Application routes
└── public/
    ├── css/
    │   └── style.css    # Stylesheets
    ├── js/
    │   └── script.js    # JavaScript files
    └── qr/              # Generated QR codes
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript
- **Templates**: EJS
- **QR Generation**: qrcode library
- **Icons**: Font Awesome

## Security Features

- **Authentication**: Username/password login required for admin access
- **Session Management**: Secure session-based authentication with cookies
- **Route Protection**: All admin routes are protected from unauthorized access
- **Input Validation**: Comprehensive validation for all forms
- **SQL Injection Prevention**: Parameterized queries for database operations
- **Unique Constraints**: Serial number uniqueness enforced at database level
- **Session Expiration**: Automatic logout after 24 hours of inactivity

## Future Enhancements

- User authentication and authorization
- Role-based access control
- Bulk import/export functionality
- Advanced reporting and analytics
- Email notifications
- API endpoints for external integrations 