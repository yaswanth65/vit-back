import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Environment Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = 3001; // Separate port from main app

// R2 Setup
const r2 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true, // Required for some S3-compatible services
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const upload = multer({ storage: multer.memoryStorage() });

// HTML Template
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>R2 Verify - Upload & Preview</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
        .card { border: 1px solid #ccc; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { margin-top: 0; color: #333; }
        .form-group { margin-bottom: 1rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
        input[type="file"] { display: block; width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #0070f3; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-size: 1rem; }
        button:hover { background: #0051a2; }
        #status { margin-top: 1rem; padding: 1rem; border-radius: 4px; display: none; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        #results { margin-top: 2rem; display: none; }
        .btn-group { display: flex; gap: 1rem; margin-top: 1rem; }
        .btn-outline { background: transparent; border: 1px solid #0070f3; color: #0070f3; text-decoration: none; display: inline-block; padding: 0.75rem 1.5rem; border-radius: 4px; text-align: center; }
        .btn-outline:hover { background: #0070f3; color: white; }
    </style>
</head>
<body>
    <div class="card">
        <h1>R2 Storage Verification</h1>
        <p>Upload a PDF file to test R2 integration. The file will be uploaded, then available for preview and download.</p>
        
        <form id="uploadForm">
            <div class="form-group">
                <label for="fileInput">Select PDF File</label>
                <input type="file" id="fileInput" name="file" accept=".pdf" required>
            </div>
            <button type="submit" id="submitBtn">Upload to R2</button>
        </form>

        <div id="status"></div>

        <div id="results">
            <h3>File Uploaded Successfully!</h3>
            <p><strong>Filename:</strong> <span id="fileNameDisplay"></span></p>
            <div class="btn-group">
                <a id="previewLink" href="#" target="_blank" class="btn-outline">👁️ Preview PDF</a>
                <a id="downloadLink" href="#" class="btn-outline">⬇️ Download PDF</a>
            </div>
        </div>
    </div>

    <script>
        const form = document.getElementById('uploadForm');
        const statusDiv = document.getElementById('status');
        const resultsDiv = document.getElementById('results');
        const submitBtn = document.getElementById('submitBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('fileInput');
            if (!fileInput.files.length) return;

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            submitBtn.disabled = true;
            submitBtn.textContent = 'Uploading...';
            statusDiv.style.display = 'none';
            resultsDiv.style.display = 'none';

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    statusDiv.textContent = 'Upload successful!';
                    statusDiv.className = 'success';
                    statusDiv.style.display = 'block';
                    
                    document.getElementById('fileNameDisplay').textContent = data.originalName;
                    document.getElementById('previewLink').href = \`/files/\${data.key}?preview=true\`;
                    document.getElementById('downloadLink').href = \`/files/\${data.key}?download=true\`;
                    resultsDiv.style.display = 'block';
                } else {
                    throw new Error(data.message || 'Upload failed');
                }
            } catch (err) {
                statusDiv.textContent = err.message;
                statusDiv.className = 'error';
                statusDiv.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload to R2';
            }
        });
    </script>
</body>
</html>
`;

// Routes
app.get('/', (req, res) => {
    res.send(htmlTemplate);
});

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const key = `test-uploads/${Date.now()}-${req.file.originalname}`;

    try {
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        });

        await r2.send(command);

        console.log(`Successfully uploaded ${key} to ${process.env.R2_BUCKET_NAME}`);
        
        res.json({
            message: 'File uploaded successfully',
            key: key,
            originalName: req.file.originalname
        });
    } catch (error) {
        console.error('Error uploading to R2:', error);
        res.status(500).json({ message: 'Failed to upload file', error: error.message });
    }
});

app.get('/files/:key(*)', async (req, res) => {
    const key = req.params.key;
    const isDownload = req.query.download === 'true';

    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        const response = await r2.send(command);
        
        // Set headers
        res.setHeader('Content-Type', response.ContentType || 'application/octet-stream');
        res.setHeader('Content-Length', response.ContentLength);
        
        if (isDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(key)}"`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename="${path.basename(key)}"`); // Inline for preview
        }

        // Pipe the stream
        response.Body.pipe(res);

    } catch (error) {
        console.error('Error retrieving file:', error);
        res.status(404).json({ message: 'File not found or error retrieving', error: error.message });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`
🚀 R2 Verification Server Running!
----------------------------------
Open your browser to: http://localhost:${port}
Upload a PDF to test R2 upload, preview, and download.
    `);
});
