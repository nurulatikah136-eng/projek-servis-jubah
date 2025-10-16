// js/script.js

document.addEventListener('DOMContentLoaded', function() {
    
    // Simpan data dalam localStorage untuk dihantar antara halaman
    const saveToLocalStorage = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const getFromLocalStorage = (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    };
    
    // ===============================================
    // LOGIK UNTUK HALAMAN 2: PILIH SERVIS
    // ===============================================
    if (document.getElementById('service-form')) {
        const serviceForm = document.getElementById('service-form');
        const serviceOptions = document.querySelectorAll('.service-option');
        const totalPriceEl = document.getElementById('total-price');

        // Kemas kini harga apabila pilihan servis berubah
        serviceForm.addEventListener('change', (e) => {
            if (e.target.name === 'service') {
                const price = parseFloat(e.target.value).toFixed(2);
                totalPriceEl.textContent = price;

                // Highlight pilihan yang aktif
                serviceOptions.forEach(opt => opt.classList.remove('selected'));
                e.target.closest('.service-option').classList.add('selected');
            }
        });

        // Apabila form diserahkan, simpan data dan pergi ke halaman seterusnya
        serviceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const selectedService = serviceForm.querySelector('input[name="service"]:checked');
            if (!selectedService) {
                alert('Sila pilih satu servis.');
                return;
            }
            
            const orderDetails = {
                serviceText: selectedService.getAttribute('data-text'),
                price: selectedService.value
            };
            
            saveToLocalStorage('orderDetails', orderDetails);
            window.location.href = 'isi-maklumat.html';
        });
    }

    // ===============================================
    // LOGIK UNTUK HALAMAN 3: ISI MAKLUMAT & UPLOAD
    // ===============================================
    if (document.getElementById('info-form')) {
        const infoForm = document.getElementById('info-form');
        const uploadAreas = document.querySelectorAll('.file-upload-area');

        // Logik untuk muat naik fail (drag & drop) - KEKAL SAMA
        uploadAreas.forEach(area => {
            const fileInput = area.querySelector('.file-input');
            const statusEl = document.getElementById(`status-${area.id.split('-')[1]}`);

            area.addEventListener('click', () => fileInput.click());
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('drag-over');
            });
            area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    fileInput.files = files;
                    handleFile(files[0], statusEl);
                }
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    handleFile(fileInput.files[0], statusEl);
                }
            });
        });
        
        function handleFile(file, statusEl) {
            if (file.type !== 'application/pdf') {
                statusEl.innerHTML = `<span style="color: var(--error-color);">Ralat: Sila muat naik fail PDF sahaja.</span>`;
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                 statusEl.innerHTML = `<span style="color: var(--error-color);">Ralat: Saiz fail tidak boleh melebihi 5MB.</span>`;
                 return;
            }
            statusEl.innerHTML = `
                <span>${file.name}</span>
                <div style="width: 100%; background: #333; border-radius: 5px; margin-top: 5px;">
                    <div class="progress-bar" style="width: 0%; height: 5px; border-radius: 5px;"></div>
                </div>`;
            let width = 0;
            const interval = setInterval(() => {
                if (width >= 100) {
                    clearInterval(interval);
                    statusEl.innerHTML = `✅ ${file.name} berjaya dimuat naik.`;
                } else {
                    width++;
                    statusEl.querySelector('.progress-bar').style.width = width + '%';
                }
            }, 10);
        }
        
        // FUNGSI SUBMIT BORANG YANG DIKEMAS KINI UNTUK FIREBASE
        infoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
        
            // Dapatkan butang submit untuk memaparkan status 'loading'
            const submitBtn = infoForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Menghantar...';
        
            try {
                // Kumpul semua data dari borang
                const formData = {
                    fullName: document.getElementById('full-name').value,
                    matricNo: document.getElementById('matric-no').value,
                    phoneNo: document.getElementById('phone-no').value,
                    address: document.getElementById('address').value,
                    deliveryTime: document.getElementById('delivery-time').value,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp() // Tambah tarikh & masa tempahan
                };
                
                // Dapatkan maklumat servis yang dipilih dari localStorage
                const orderDetails = getFromLocalStorage('orderDetails');
        
                // Gabungkan kedua-dua data
                const finalOrderData = { ...formData, ...orderDetails };
        
                // Hantar data ke Firestore!
                // Ini akan mencipta satu "collection" bernama "tempahan"
                await db.collection("tempahan").add(finalOrderData);
        
                // Maklumkan pengguna ia berjaya
                alert("Tempahan berjaya dihantar!");
        
                // Simpan data untuk halaman semakan (masih guna localStorage untuk ini)
                saveToLocalStorage('formData', formData);
                
                // Simpan nama fail (simulasi) untuk halaman semakan
                const uploadedFileNames = {
                    file1: document.querySelector('[name="file1"]').files[0]?.name || 'Borang Semakan.pdf',
                    file2: document.querySelector('[name="file2"]').files[0]?.name || 'Slip Tempahan.pdf',
                    file3: document.querySelector('[name="file3"]').files[0]?.name || 'SPKG & Alumni.pdf',
                    file4: document.querySelector('[name="file4"]').files[0]?.name || 'Surat Kuasa.pdf',
                };
                saveToLocalStorage('fileNames', uploadedFileNames);

                // Teruskan ke halaman seterusnya
                window.location.href = 'semak-pesanan.html';
        
            } catch (error) {
                // Jika ada ralat, paparkannya
                console.error("Ralat semasa menghantar tempahan: ", error);
                alert("Maaf, berlaku ralat semasa menghantar tempahan anda. Sila cuba lagi.");
                
                // Aktifkan semula butang
                submitBtn.disabled = false;
                submitBtn.textContent = 'Semak Maklumat → Page 4';
            }
        });
    }

    // ===============================================
    // LOGIK UNTUK HALAMAN 4: SEMAK PESANAN
    // ===============================================
    if (document.getElementById('confirmation-form')) {
        const orderDetails = getFromLocalStorage('orderDetails');
        const fileNames = getFromLocalStorage('fileNames');
        
        if (orderDetails) {
            document.getElementById('selected-service').textContent = orderDetails.serviceText;
            document.getElementById('final-price').textContent = `RM ${parseFloat(orderDetails.price).toFixed(2)}`;
        }

        if (fileNames) {
            const fileList = document.getElementById('uploaded-files');
            fileList.innerHTML = `
                <li>✅ ${fileNames.file1}</li>
                <li>✅ ${fileNames.file2}</li>
                <li>✅ ${fileNames.file3}</li>
                <li>✅ ${fileNames.file4}</li>
            `;
        }


        const confirmCheckbox = document.getElementById('confirm-checkbox');
        const paymentBtn = document.getElementById('payment-btn');

        confirmCheckbox.addEventListener('change', () => {
            paymentBtn.disabled = !confirmCheckbox.checked;
        });
        
        document.getElementById('confirmation-form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (confirmCheckbox.checked) {
                window.location.href = 'pembayaran.html';
            }
        });
    }

    // ===============================================
    // LOGIK UNTUK HALAMAN 5: PEMBAYARAN
    // ===============================================
    if (document.querySelector('.payment-container')) {
        const loadingSection = document.getElementById('loading-section');
        const successSection = document.getElementById('success-section');
        
        // Simulasi proses pembayaran
        setTimeout(() => {
            loadingSection.style.display = 'none';
            successSection.style.display = 'block';
            
            if (typeof confetti === 'function') {
                const myCanvas = document.getElementById('confetti-canvas');
                const myConfetti = confetti.create(myCanvas, {
                    resize: true,
                    useWorker: true
                });
                myConfetti({
                    particleCount: 150,
                    spread: 90,
                    origin: { y: 0.6 }
                });
            }

        }, 3000); // Tunggu 3 saat

        // Logik untuk muat turun resit PDF
        document.getElementById('download-receipt').addEventListener('click', () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const orderDetails = getFromLocalStorage('orderDetails');
            const formData = getFromLocalStorage('formData');
            const today = new Date();
            const dateString = `${today.getDate()} ${today.toLocaleString('ms-MY', { month: 'long' })} ${today.getFullYear()}`;


            // Header Resit
            doc.setFontSize(18);
            doc.setTextColor('#0b132b');
            doc.text("RESIT PEMBAYARAN", 105, 20, null, null, "center");
            doc.setFontSize(12);
            doc.text("Servis Pengambilan & Penghantaran Jubah", 105, 28, null, null, "center");
            
            doc.setDrawColor('#ffd700');
            doc.line(20, 35, 190, 35); // Garisan pemisah

            // Info Transaksi
            doc.setTextColor('#333');
            doc.text("Tarikh Pembayaran:", 20, 45);
            doc.text(dateString, 80, 45);
            doc.text("No. Transaksi:", 20, 52);
            doc.text(`TYP-${Date.now().toString().slice(-6)}`, 80, 52);
            doc.text("Kaedah Bayaran:", 20, 59);
            doc.text("FPX (Simulasi)", 80, 59);

            doc.line(20, 66, 190, 66);

            // Butiran Pelanggan
            doc.setFontSize(14);
            doc.setTextColor('#0b132b');
            doc.text("Butiran Pelanggan", 20, 76);
            doc.setFontSize(12);
            doc.setTextColor('#333');
            doc.text("Nama Penuh:", 20, 85);
            doc.text(formData ? formData.fullName : 'N/A', 80, 85);
            doc.text("No. Matrik:", 20, 92);
            doc.text(formData ? formData.matricNo : 'N/A', 80, 92);
             doc.text("No. Telefon:", 20, 99);
            doc.text(formData ? formData.phoneNo : 'N/A', 80, 99);

            doc.line(20, 106, 190, 106);
            
            // Servis Dipilih
            doc.setFontSize(14);
            doc.setTextColor('#0b132b');
            doc.text("Servis Dipilih", 20, 116);
            doc.setFontSize(12);
            doc.setTextColor('#333');
            doc.text(orderDetails ? `> ${orderDetails.serviceText}` : "Tiada servis dipilih", 20, 125);

            // Total
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor('#0b132b');
            doc.text("Jumlah Bayaran:", 20, 140);
            doc.text(orderDetails ? `RM${parseFloat(orderDetails.price).toFixed(2)}` : "RM0.00", 190, 140, null, null, "right");
            doc.text("Status Pembayaran:", 20, 147);
            doc.setTextColor('#28a745');
            doc.text("BERJAYA", 190, 147, null, null, "right");
            
            doc.setFont(undefined, 'normal');

            doc.line(20, 155, 190, 155);

            // Mesej Penutup
            doc.setFontSize(10);
            doc.setTextColor('#555');
            doc.text("Syabas dan tahniah kepada para graduan.", 105, 165, null, null, "center");
            doc.text("Terima kasih kerana menggunakan servis kami.", 105, 170, null, null, "center");
            doc.text("Semoga hari konvokesyen anda penuh makna 🎓✨", 105, 175, null, null, "center");

            // Footer Resit
            doc.setDrawColor('#ffd700');
            doc.line(20, 270, 190, 270);
            doc.setTextColor('#0b132b');
            doc.text("UNIMAS | Graduasi 2025", 105, 278, null, null, "center");

            doc.save(`resit-pembayaran-${formData.matricNo || 'N_A'}.pdf`);

            // Clear local storage after receipt is generated
            localStorage.removeItem('orderDetails');
            localStorage.removeItem('formData');
            localStorage.removeItem('fileNames');
        });
    }
});
