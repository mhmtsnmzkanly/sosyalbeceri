# Sosyalbeceri

JSON verilerinden TikTok paylaşımına hazır, tam `1080×1920` PNG sosyal
beceri kartları üreten çevrimdışı TypeScript renderer.

Proje tarayıcı, HTML/CSS, Playwright veya harici servis kullanmaz. Çizim
işlemleri Node.js üzerinde `@napi-rs/canvas` ile gerçekleştirilir.

## Özellikler

- Adaptif yüksekliğe sahip, yatay ve dikey ortalanmış kart
- Tek sütunda dört eşit cevap kutusu
- Tüm cevaplarda ortak ve dinamik font boyutu
- Atkinson Hyperlegible Next ile Türkçe karakter desteği
- Dört seviyeli zorluk maskotu
- İsteğe bağlı `contain` veya `cover` medya
- Tek kart ve toplu JSON render desteği
- `.env` üzerinden tema, font ve global asset yapılandırması
- Yerel font ve görsellerle tamamen çevrimdışı çalışma
- Tek dosyalık `dist/renderer.js` bundle çıktısı

## Gereksinimler

- Node.js 22 veya üzeri
- npm

## Kurulum

```bash
npm install
npm run build
```

CLI açılışta `.env` dosyasını kontrol eder. Dosya yoksa `.env.example`
bulunduğunda oluşturmak için kullanıcıdan onay ister. Manuel oluşturmak için:

```bash
cp .env.example .env
```

Gerçek `.env` Git tarafından takip edilmez. Repoda yalnızca güvenli örnek
değerleri içeren `.env.example` tutulur.

## Kullanım

Tek kart render etmek:

```bash
npm run render -- data/kart.json
```

Toplu kart dosyası render etmek:

```bash
npm run render -- data/claude-cards.json
```

Bu komut çıktıları JSON dosyasının adına göre oluşturulan klasöre yazar:

```text
output/claude-cards/<kart-id>.png
```

Varsayılan veri setinin tamamını üretmek:

```bash
npm run render:all
```

Stres kartlarını üretmek:

```bash
npm run render:stress
```

Derlenmiş CLI ve tek dosyalık bundle üretmek:

```bash
npm run bundle
```

Bundle çıktısı:

```text
dist/renderer.js
```

`@napi-rs/canvas` yerel/native bağımlılık olduğu için bundle içine gömülmez.
Bundle çalıştırılmadan önce proje bağımlılıklarının kurulmuş olması gerekir.

## Kart JSON biçimi

```json
{
  "id": "MK-001",
  "category": "Sınır Koyma",
  "scenario": "Bir tanıdığınız özel bir konuyu ısrarla soruyor.",
  "question": "Kibar ama net bir sınırı nasıl ifade edersiniz?",
  "difficulty": 1,
  "answers": {
    "A": "Birinci cevap",
    "B": "İkinci cevap",
    "C": "Üçüncü cevap",
    "D": "Dördüncü cevap"
  }
}
```

`answers` bir dizi değildir; zorunlu `A`, `B`, `C` ve `D` anahtarlarını
içeren tek nesnedir. Bu nesnedeki ek metadata alanları görmezden gelinir.

`series`, `correctAnswer`, `cta` ve tanınmayan diğer metadata alanları
renderer tarafından kullanılmaz ve doğrulama sonucunda görmezden gelinir.
Doğru cevap hiçbir durumda görselde vurgulanmaz.

`difficulty` isteğe bağlıdır. Verilmediğinde seviye `1` kabul edilir.

### İsteğe bağlı medya

```json
{
  "media": {
    "type": "image",
    "src": "assets/screenshots/ornek.jpg",
    "fit": "contain"
  }
}
```

`fit`, `contain` veya `cover` olabilir. Kaynak görselin oranı korunur ve eksik
dosya açıklayıcı hatayla reddedilir.

## Ortam yapılandırması

`.env` üzerinden aşağıdaki gruplar değiştirilebilir:

- Tema ve metin renkleri
- Kart gölgeleri
- Font ailesi ve dört statik font dosyası
- Dış desen
- İç kart deseni
- Kâğıt dokusu
- Zorluk sprite görseli

Tüm font ve asset yolları proje köküne göre çözülür. Hex renkler, `#` karakteri
env yorum başlangıcı olduğu için tırnak içinde yazılmalıdır:

```env
THEME_PRIMARY="#1557B0"
FONT_FAMILY="Atkinson Hyperlegible Next"
ASSET_OUTER_PATTERN="assets/patterns/fox-username-pattern.png"
```

Karttan karta değişen `media.src` değerleri `.env` yerine kart JSON’unda
kalmalıdır.

## Testler

```bash
npm test
```

Testler şunları kapsar:

- JSON doğrulama
- Cevap anahtarları ve ortak font boyutu
- Türkçe metin ölçümü ve font kaydı
- Adaptif layout ve grid geometrisi
- Pattern clipping ve tile davranışı
- Kart gölgesi
- Env yükleme ve oluşturma akışı
- Tam `1080×1920` PNG çıktısı

## Dizinler

```text
assets/       Renderer tarafından kullanılan font ve görseller
data/         Kart JSON dosyaları ve stres fixture'ları
src/          TypeScript kaynak kodu
tests/        Otomatik testler
output/       Üretilen PNG dosyaları; Git tarafından ignore edilir
dist/         Derlenmiş ve bundle çıktıları; Git tarafından ignore edilir
```

Ayrıntılı teknik açıklama için [docs.md](./docs.md) dosyasına bakın.

## Font lisansı

Atkinson Hyperlegible Next proje içinde yerel olarak paketlenmiştir ve SIL
Open Font License 1.1 ile lisanslanır. Lisans metni font dosyalarının yanında
`assets/fonts/atkinson-hyperlegible-next/OFL.txt` içinde bulunur.

Font açık kaynaklıdır; public domain değildir. Kişisel ve ticari projelerde
OFL koşullarına uygun olarak kullanılabilir.

## Proje lisansı

Bu projenin özgün kaynak kodu [MIT Lisansı](./LICENSE) ile sunulur. Paketlenmiş
fontlar ve kaynağı ayrıca belirtilmiş üçüncü taraf varlıklar kendi lisanslarına
tabidir ve MIT kapsamına otomatik olarak girmez.

Projeyi dağıtan veya yayınlayan kişi, `assets/` altında kullandığı görseller
için gerekli kullanım ve dağıtım haklarına sahip olduğunu doğrulamalıdır.
Kaynağı ya da lisansı belirsiz varlıklar yayın öncesinde kaldırılmalı veya
uygun lisanslı özgün alternatiflerle değiştirilmelidir. MIT lisansı üçüncü
taraf görseller için ayrıca kullanım hakkı sağlamaz.
