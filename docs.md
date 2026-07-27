# Teknik dokümantasyon

## Genel bakış

Sosyalbeceri, `CardData` nesnesini ölçerek adaptif bir kart geometrisi
oluşturur, bütün katmanları `@napi-rs/canvas` ile çizer ve sonucu PNG buffer
olarak kodlar.

Temel ilkeler:

- Canvas her zaman `1080×1920` pikseldir.
- Kart yüksekliği içeriğe göre min/max sınırlarında değişir.
- Kart matematiksel olarak yatay ve dikey ortalanır.
- Cevaplar tek sütun ve dört satırdır.
- Cevap kutuları eşit yüksekliğe sahiptir.
- Dört cevap tek bir ortak font boyutu kullanır.
- Metinler kesilmez ve üç nokta eklenmez.
- Doğru cevap görselde işaretlenmez.

## Çalışma akışı

CLI çalıştırıldığında sırasıyla:

1. Proje kökü belirlenir.
2. `.env` kontrol edilir.
3. Gerekirse `.env.example` üzerinden oluşturma onayı istenir.
4. JSON okunur ve doğrulanır.
5. Tema, font ve global asset yapılandırması yüklenir.
6. Fontlar Canvas oluşturulmadan önce kaydedilir.
7. Kart layout'u gerçek font metrikleriyle çözülür.
8. Çizim modülleri sırayla çalıştırılır.
9. Canvas PNG olarak kodlanır.
10. Çıktı `output/` altına yazılır.

Programatik `renderCard()` kullanımı etkileşimli env sorusu göstermez. `.env`
yoksa güvenli varsayılan değerler kullanılır.

## Çizim sırası

`src/render-card.ts` ayrıntılı çizim yapmaz; yalnızca modülleri yönetir:

1. `drawBackground`
2. `drawCardShell`
3. `drawHeader`
4. `drawQuestion`
5. `drawMedia` — yalnız medya varsa
6. `drawAnswers`

Güncel tasarımda görünür CTA modülü bulunmaz. Soru bölümünün altında iki kısa
yatay ayraç çizilir.

## Kaynak kod yapısı

### Giriş ve orkestrasyon

- `src/cli.ts`: Tek kart veya toplu dosya render eder.
- `src/stress-cli.ts`: `data/stress-tests/` fixture'larını render eder ve
  metrikleri raporlar.
- `src/render-card.ts`: Çizim sırasını yönetir.
- `src/load-card.ts`: Tekli ve toplu JSON dosyalarını okur.
- `src/validate-card.ts`: Runtime JSON doğrulamasını yapar.

### Yapılandırma

- `src/environment.ts`: `.env` kontrolü, oluşturma sorusu ve yükleme.
- `src/theme-type.ts`: `CardTheme`, tema env eşleştirmesi ve varsayılan tema.
- `src/asset-config.ts`: Font ve global asset env eşleştirmesi.
- `src/layout/constants.ts`: Geometrik ve tipografik layout tokenları.
- `src/layout/resolve-layout.ts`: Adaptif layout hesaplamaları.

### Canvas ve asset yönetimi

- `src/canvas/create-canvas.ts`: Font, asset, tema ve layout'u birleştirerek
  `RenderContext` oluşturur.
- `src/canvas/rounded-rect.ts`: Yuvarlatılmış dikdörtgen path yardımcısı.
- `src/assets/load-fonts.ts`: Dört statik font ağırlığını idempotent kaydeder.
- `src/assets/asset-cache.ts`: Görsellerin tekrar yüklenmesini önler.
- `src/assets/load-image.ts`: Yerel görselleri yükler ve hata mesajlarını üretir.

### Çizim modülleri

Bütün çizim modülleri `src/draw/` altındadır:

- `background.ts`: Canvas rengi ve dış desen
- `card-shell.ts`: Gölge, kart yüzeyi, dokular, iç desen ve border
- `header.ts`: Zorluk maskotu ile kategori/seri metadata rozeti
- `question.ts`: Senaryo, ana soru ve soru ayraçları
- `media.ts`: `contain`/`cover` medya
- `answers.ts`: Dört cevabın tamamı

### Metin yardımcıları

- `wrap-text.ts`: Metni maksimum genişliğe göre satırlara böler.
- `measure-text.ts`: Satır bloğunun yüksekliğini ölçer.
- `fit-text.ts`: Başlangıç fontundan minimum fonta kadar metni kutuya sığdırır.

## JSON şeması

| Alan | Tür | Kullanım |
|---|---|---|
| `id` | string | Kart üzerindeki seri numarası ve PNG dosya adı |
| `category` | string | Sağ üst metadata rozeti |
| `scenario` | string | Soru öncesindeki senaryo metni |
| `question` | string | Ana soru |
| `difficulty` | `1 \| 2 \| 3 \| 4` | Zorluk maskotu; eksikse `1` |
| `media` | object | İsteğe bağlı görsel veya illüstrasyon |
| `answers` | object | Tam olarak A, B, C ve D |
| `series` | herhangi | İsteğe bağlı metadata; görmezden gelinir |
| `correctAnswer` | herhangi | İsteğe bağlı metadata; görmezden gelinir |
| `cta` | herhangi | İsteğe bağlı metadata; görmezden gelinir |

Toplu dosya biçimi:

```json
{
  "cards": [
    {
      "id": "MK-001"
    }
  ]
}
```

Gerçek kart nesneleri `id`, `category`, `scenario`, `question` ve `answers`
alanlarını içermelidir. `difficulty` ile `media` isteğe bağlıdır ancak
verildiklerinde doğrulanırlar. Bunların dışındaki alanlar render sonucunu
etkilemez ve normalize edilen `CardData` nesnesine aktarılmaz.

## Adaptif layout

Layout resolver önce gerçek metin metriklerini hesaplar:

- Header
- Senaryo
- Soru
- Soru ayraçları
- İsteğe bağlı medya
- Cevap grid'i
- Bölümler arası kontrollü boşluklar

Kart yüksekliği gereken içerik ve tercih edilen boşluklardan üretilir, ardından
merkezi minimum ve maksimum yüksekliğe sıkıştırılır:

```text
cardY = (1920 - cardHeight) / 2
```

Boş alan tek bir noktaya bırakılmaz. Her spacing rolünün minimum, tercih
edilen, maksimum ve ağırlık değeri vardır. Resolver boşluğu bu sınırlar
arasında dağıtır.

Medya bulunmayan kartlarda medya dikdörtgeni ve medya boşluğu oluşturulmaz.

## Cevap geometrisi

Cevaplar:

- `1×4` düzendedir.
- Eşit genişlik ve yüksekliğe sahiptir.
- Ortak font boyutu kullanır.
- Dinamik kutu yüksekliğine sahiptir.
- Minimum fontta da sığmazsa açıklayıcı hata üretir.

Grid yüksekliği:

```text
rows × boxHeight + (rows - 1) × rowGap
```

Dört satır için üç adet row gap hesaba katılır.

## Ortam değişkenleri

### Tema

| Değişken | Açıklama |
|---|---|
| `THEME_CANVAS_BACKGROUND` | Dış canvas zemini |
| `THEME_CARD_BACKGROUND` | Kart yüzeyi |
| `THEME_MEDIA_BACKGROUND` | Medya kutusu zemini |
| `THEME_PRIMARY` | Ana marka rengi |
| `THEME_PRIMARY_SOFT` | Açık marka yüzeyi |
| `THEME_TEXT` | Gövde metni |
| `THEME_MUTED_TEXT` | İkincil metin |
| `THEME_BORDER` | Kart ve metadata border rengi |
| `THEME_ANSWER_BORDER` | Cevap border rengi |
| `THEME_DIVIDER` | Soru ve metadata ayraçları |
| `THEME_PATTERN_FALLBACK` | Pattern fallback rengi |
| `THEME_SHADOW` | Ana kart gölgesi |
| `THEME_CONTACT_SHADOW` | İsteğe bağlı temas gölgesi |
| `THEME_WHITE` | Beyaz yüzey/metin rengi |

### Fontlar

| Değişken | Açıklama |
|---|---|
| `FONT_FAMILY` | Canvas içinde kullanılacak aile adı |
| `FONT_REGULAR_PATH` | 400 ağırlığı |
| `FONT_MEDIUM_PATH` | 500 ağırlığı |
| `FONT_SEMIBOLD_PATH` | 600 ağırlığı |
| `FONT_BOLD_PATH` | 700 ağırlığı |

Font yolları değiştirilirse dört dosyanın da aynı aileye ait gerçek statik
fontlar olması gerekir. Eksik dosya veya eksik ağırlık sessiz fallback yerine
hata üretir.

### Global görseller

| Değişken | Açıklama |
|---|---|
| `ASSET_OUTER_PATTERN` | Kart dışında tekrarlanan pattern |
| `ASSET_INNER_PATTERN` | Kart içinde kırpılan geometrik pattern |
| `ASSET_PAPER_TEXTURE` | İsteğe bağlı kâğıt dokusu |
| `ASSET_DIFFICULTY_SPRITE` | Dört zorluk maskotunu içeren sprite |

Bu yollar kartlara özel değildir. Kart medyası `media.src` ile JSON içinde
belirtilir.

## `.env` başlangıç davranışı

- `.env` varsa herhangi bir soru sorulmaz.
- `.env` yok ve `.env.example` varsa interaktif onay istenir.
- Enter veya `e/evet/y/yes` ile örnek dosya kopyalanır.
- Kullanıcı reddederse varsayılan değerlerle devam edilir.
- Etkileşimsiz ortamda `.env` yoksa açık hata verilir.
- Var olan `.env` hiçbir zaman ezilmez.

## Çıktı davranışı

Tek kart:

```text
output/<id>.png
```

Toplu kart:

```text
output/<json-dosya-adı>/<id>.png
```

Örneğin:

```text
data/claude-cards.json
→ output/claude-cards/MK-001.png
```

Kart ID'si path separator içeremez.

## Derleme ve bundle

```bash
npm run build
npm run bundle
```

`npm run build`, TypeScript dosyalarını `dist/src/` ve testleri
`dist/tests/` altına derler.

`npm run bundle`, CLI girişini `dist/renderer.js` dosyasına paketler.
`@napi-rs/canvas` external bırakılır; native paket `node_modules` içinde
bulunmalıdır.

## Test ve doğrulama

```bash
npm test
npm run render:stress
```

Stres CLI her başarılı kart için:

- PNG boyutunu
- Kart yüksekliğini
- Kart durumunu
- Ortak cevap font boyutunu
- Minimum fonta ulaşılıp ulaşılmadığını

raporlar.

## Lisanslar

Projenin özgün kaynak kodu MIT Lisansı altındadır.

Atkinson Hyperlegible Next, SIL Open Font License 1.1 kapsamındadır. Font
lisansı `assets/fonts/atkinson-hyperlegible-next/OFL.txt` dosyasında korunur.

Kaynağı ayrıca belgelenen görseller ve diğer üçüncü taraf içerikler kendi
lisans koşullarına tabi olabilir.

Dağıtım öncesinde `assets/` altındaki her görselin kullanım ve yeniden dağıtım
hakkı proje sahibi tarafından doğrulanmalıdır. Kaynağı veya lisansı belirsiz
bir asset, uygun lisanslı özgün bir dosyayla değiştirilmelidir. Projenin MIT
lisansı üçüncü taraf görsel haklarını kapsamaz.
