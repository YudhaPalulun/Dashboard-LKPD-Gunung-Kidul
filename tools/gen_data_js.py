import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from data import *
assert validate()
YR = [2022,2023,2024,2025]
bel = [dict(kode=r["kode"], kelompok=r["kelompok"], uraian=r["uraian"],
            anggaran={str(y): round(r["anggaran"][y-2023],2) for y in YEARS},
            realisasi={str(y): round(r["realisasi"][y-2022],2) for y in YR}) for r in belanja_rows()]
beb = [dict(kode=r["kode"], kelompok=r["kelompok"], uraian=r["uraian"],
            nilai={str(y): round(r["nilai"][y-2022],2) for y in YR}) for r in beban_rows()]
out = dict(pemda="Kabupaten Gunungkidul", tahun=YEARS, tahunPembanding=2022,
           sumber="LKPD Pemerintah Kabupaten Gunungkidul: Laporan Realisasi Anggaran (LRA) dan Laporan Operasional (LO) TA 2023, 2024, 2025",
           belanja=bel, beban=beb)
open(os.path.join(HERE, "..", "js", "data.js"),"w").write("/* Data LKPD Kabupaten Gunungkidul (Rupiah). Disalin dari PDF LRA & LO, divalidasi terhadap subtotal/total di dokumen. */\nwindow.LKPD = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
print("ok", len(bel), len(beb))
