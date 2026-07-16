import re

with open('/home/mertemir/.gemini/antigravity/brain/cdcad73e-e924-4d45-8e4d-854b1ab02f33/task.md', 'r') as f:
    task_content = f.read()

task_content = task_content.replace("- [ ]", "- [x]")
with open('/home/mertemir/.gemini/antigravity/brain/cdcad73e-e924-4d45-8e4d-854b1ab02f33/task.md', 'w') as f:
    f.write(task_content)

with open('/home/mertemir/.gemini/antigravity/brain/cdcad73e-e924-4d45-8e4d-854b1ab02f33/walkthrough.md', 'r') as f:
    wt_content = f.read()

v35_features = """
### 🚀 V3.5 Performans ve Hata Düzeltmeleri
- **Artımlı (Incremental) Mesajlaşma:** Artık mesaj attığınızda ekran kesinlikle yenilenmeyecek. Mesajlar pürüzsüz bir animasyonla alta eklenecek.
- **Push Bildirimler:** Uygulama arka plandayken veya telefon cebindeyken mesaj veya arama gelirse ekrana "Bildirim" (Notification) düşecek. (Tarayıcıdan izin vermeniz istenir).
- **Gelişmiş Arama:** WebRTC bağlantısı güçlendirildi, 4 farklı Google STUN sunucusu eklendi (Farklı Wi-Fi'lar için). Ayrıca arama geldiğinde **zil çalma sesi** eklendi!
- **Üst Panel İyileştirmesi:** Arama ikonları ve profil ikonları daha iyi konumlandırıldı. Gönder butonu sorunu tamamen çözüldü.

"""
wt_content = wt_content.replace("## 🚀 Nasıl Kullanacaksın?", v35_features + "\n## 🚀 Nasıl Kullanacaksın?")

with open('/home/mertemir/.gemini/antigravity/brain/cdcad73e-e924-4d45-8e4d-854b1ab02f33/walkthrough.md', 'w') as f:
    f.write(wt_content)
