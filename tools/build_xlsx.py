import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.series import DataPoint
from openpyxl.drawing.image import Image as XLImage
from data import *

OUT = os.environ.get("OUT_DIR", os.path.join(HERE, "..", "downloads"))
GB = ["Belanja Operasi","Belanja Modal","Belanja Tidak Terduga","Belanja Transfer"]
GL = ["Beban Operasi","Beban Penyusutan dan Amortisasi","Beban Transfer","Beban Tak Terduga"]
F = "Arial"
GREEN="1F6F54"; GREEN_L="E3F1EA"; GREEN_M="C7E3D5"; GREY="F3F5F4"
RP = '#,##0.00;(#,##0.00);"-"'; PCT = '0.00%;(0.00%);"-"'; MIL = '#,##0.00'
thin = Side(style="thin", color="B7C4BD"); BOX = Border(left=thin,right=thin,top=thin,bottom=thin)

def font(b=False, c="000000", s=10, i=False): return Font(name=F, bold=b, color=c, size=s, italic=i)
def fill(c): return PatternFill("solid", start_color=c, end_color=c)
def hdr(ws, r, vals, c0=1):
    for j,v in enumerate(vals):
        c = ws.cell(r, c0+j, v); c.font = font(True,"FFFFFF"); c.fill = fill(GREEN)
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True); c.border = BOX
    ws.row_dimensions[r].height = 32

def title(ws, text, sub, span):
    ws.merge_cells(start_row=1,start_column=1,end_row=1,end_column=span)
    ws.merge_cells(start_row=2,start_column=1,end_row=2,end_column=span)
    ws["A1"] = text; ws["A1"].font = font(True,GREEN,13); ws["A1"].alignment = Alignment(vertical="center")
    ws["A2"] = sub; ws["A2"].font = font(False,"5A6B63",9,True)
    ws.row_dimensions[1].height = 24

def build(Y):
    ai, ri, pi = Y-2023, Y-2022, Y-2023     # indeks anggaran / realisasi tahun ini / realisasi tahun lalu
    wb = Workbook()
    dash = wb.active; dash.title = "Dashboard"
    lra = wb.create_sheet("Rincian LRA"); lo = wb.create_sheet("Rincian LO")
    dg = wb.create_sheet("Data Grafik"); cat = wb.create_sheet("Catatan & Sumber")
    br, lr = belanja_rows(), beban_rows()

    # ---------- Rincian LRA ----------
    title(lra, f"RINCIAN LAPORAN REALISASI ANGGARAN – BELANJA DAERAH, PEMERINTAH KABUPATEN GUNUNGKIDUL, TA {Y}",
          "(dalam rupiah) · Sumber: LKPD Kabupaten Gunungkidul. Angka biru = salinan dari dokumen sumber; angka hitam = rumus.", 8)
    hdr(lra, 4, ["Ref", "Uraian", f"Anggaran {Y}", f"Realisasi {Y}", "Capaian (%)", f"Realisasi {Y-1}", "Selisih (Rp)", "Perubahan (%)"])
    r = 5; sub = {}
    for g in GB:
        lra.cell(r,2,g.upper()).font = font(True); 
        for c in range(1,9): lra.cell(r,c).fill = fill(GREY)
        r += 1; first = r
        for row in [x for x in br if x["kelompok"]==g]:
            lra.cell(r,1,row["kode"]).font = font(c="5A6B63")
            lra.cell(r,2,row["uraian"]).font = font(); lra.cell(r,2).alignment = Alignment(indent=1)
            for col,val in ((3,row["anggaran"][ai]),(4,row["realisasi"][ri]),(6,row["realisasi"][pi])):
                c = lra.cell(r,col,val); c.font = font(c="0000FF"); c.number_format = RP
            lra.cell(r,5,f"=IF(C{r}=0,0,D{r}/C{r})"); lra.cell(r,7,f"=D{r}-F{r}"); lra.cell(r,8,f"=IF(F{r}=0,0,G{r}/F{r})")
            r += 1
        last = r-1
        lra.cell(r,2,f"Jumlah {g}").font = font(True)
        for col in (3,4,6):
            L_ = "CDEFGH"[col-3]; lra.cell(r,col,f"=SUM({L_}{first}:{L_}{last})")
        lra.cell(r,5,f"=IF(C{r}=0,0,D{r}/C{r})"); lra.cell(r,7,f"=D{r}-F{r}"); lra.cell(r,8,f"=IF(F{r}=0,0,G{r}/F{r})")
        for c in range(1,9): lra.cell(r,c).fill = fill(GREEN_L); lra.cell(r,c).font = font(True)
        sub[g] = r; r += 2
    tot = r
    lra.cell(tot,2,"JUMLAH BELANJA")
    for col in (3,4,6):
        L_ = "CDEFGH"[col-3]; lra.cell(tot,col,"="+"+".join(f"{L_}{sub[g]}" for g in GB))
    lra.cell(tot,5,f"=IF(C{tot}=0,0,D{tot}/C{tot})"); lra.cell(tot,7,f"=D{tot}-F{tot}"); lra.cell(tot,8,f"=IF(F{tot}=0,0,G{tot}/F{tot})")
    for c in range(1,9): lra.cell(tot,c).fill = fill(GREEN); lra.cell(tot,c).font = font(True,"FFFFFF")
    for rr in range(5, tot+1):
        for c in range(1,9):
            cell = lra.cell(rr,c); cell.border = BOX
            if c in (3,4,6,7): cell.number_format = RP
            if c in (5,8): cell.number_format = PCT
            if cell.font.name != F: cell.font = font()
    for col,w in zip("ABCDEFGH",[13,46,22,22,12,22,22,13]): lra.column_dimensions[col].width = w
    lra.freeze_panes = "C5"

    # ---------- Rincian LO ----------
    title(lo, f"RINCIAN LAPORAN OPERASIONAL – BEBAN, PEMERINTAH KABUPATEN GUNUNGKIDUL, TA {Y}",
          "(dalam rupiah) · LO tidak memuat anggaran, sehingga yang dibandingkan adalah tahun berjalan dengan tahun sebelumnya.", 6)
    hdr(lo, 4, ["Ref","Uraian",f"Tahun {Y}",f"Tahun {Y-1}","Kenaikan/Penurunan (Rp)","Perubahan (%)"])
    r = 5; lsub = {}
    for g in GL:
        lo.cell(r,2,g.upper()).font = font(True)
        for c in range(1,7): lo.cell(r,c).fill = fill(GREY)
        r += 1; first = r
        for row in [x for x in lr if x["kelompok"]==g]:
            lo.cell(r,1,row["kode"]).font = font(c="5A6B63")
            lo.cell(r,2,row["uraian"]).font = font(); lo.cell(r,2).alignment = Alignment(indent=1)
            for col,val in ((3,row["nilai"][ri]),(4,row["nilai"][pi])):
                c = lo.cell(r,col,val); c.font = font(c="0000FF")
            lo.cell(r,5,f"=C{r}-D{r}"); lo.cell(r,6,f"=IF(D{r}=0,0,E{r}/D{r})")
            r += 1
        last = r-1
        lo.cell(r,2,f"Jumlah {g}")
        lo.cell(r,3,f"=SUM(C{first}:C{last})"); lo.cell(r,4,f"=SUM(D{first}:D{last})")
        lo.cell(r,5,f"=C{r}-D{r}"); lo.cell(r,6,f"=IF(D{r}=0,0,E{r}/D{r})")
        for c in range(1,7): lo.cell(r,c).fill = fill(GREEN_L); lo.cell(r,c).font = font(True)
        lsub[g] = r; r += 2
    ltot = r
    lo.cell(ltot,2,"JUMLAH BEBAN")
    for col,L_ in ((3,"C"),(4,"D")): lo.cell(ltot,col,"="+"+".join(f"{L_}{lsub[g]}" for g in GL))
    lo.cell(ltot,5,f"=C{ltot}-D{ltot}"); lo.cell(ltot,6,f"=IF(D{ltot}=0,0,E{ltot}/D{ltot})")
    for c in range(1,7): lo.cell(ltot,c).fill = fill(GREEN); lo.cell(ltot,c).font = font(True,"FFFFFF")
    for rr in range(5, ltot+1):
        for c in range(1,7):
            cell = lo.cell(rr,c); cell.border = BOX
            if c in (3,4,5): cell.number_format = RP
            if c == 6: cell.number_format = PCT
            if cell.font.name != F: cell.font = font()
    for col,w in zip("ABCDEF",[13,48,24,24,26,14]): lo.column_dimensions[col].width = w
    lo.freeze_panes = "C5"

    # ---------- Data Grafik (Rp miliar) ----------
    title(dg, f"DATA SUMBER GRAFIK (Rp miliar) – TA {Y}", "Dihitung otomatis dari sheet Rincian LRA dan Rincian LO. Jangan diubah manual.", 4)
    def sec(r, text): dg.cell(r,1,text).font = font(True,GREEN,11)
    sec(4,"1. Anggaran vs Realisasi Belanja per Kelompok"); hdr(dg,5,["Kelompok","Anggaran","Realisasi","Capaian (%)"])
    for i,g in enumerate(GB):
        rr = 6+i; dg.cell(rr,1,g)
        dg.cell(rr,2,f"='Rincian LRA'!C{sub[g]}/10^9"); dg.cell(rr,3,f"='Rincian LRA'!D{sub[g]}/10^9"); dg.cell(rr,4,f"=IF(B{rr}=0,0,C{rr}/B{rr})")
    dg.cell(10,1,"Total Belanja"); dg.cell(10,2,"=SUM(B6:B9)"); dg.cell(10,3,"=SUM(C6:C9)"); dg.cell(10,4,"=IF(B10=0,0,C10/B10)")
    sec(13,"2. Komposisi Realisasi Belanja"); hdr(dg,14,["Kelompok","Realisasi","Porsi (%)"])
    for i,g in enumerate(GB):
        rr = 15+i; dg.cell(rr,1,g); dg.cell(rr,2,f"=C{6+i}"); dg.cell(rr,3,f"=IF($B$19=0,0,B{rr}/$B$19)")
    dg.cell(19,1,"Total"); dg.cell(19,2,"=SUM(B15:B18)"); dg.cell(19,3,"=SUM(C15:C18)")
    sec(22,"3. Beban (LO) per Kelompok"); hdr(dg,23,["Kelompok",f"Tahun {Y}",f"Tahun {Y-1}","Perubahan (%)"])
    for i,g in enumerate(GL):
        rr = 24+i; dg.cell(rr,1,g)
        dg.cell(rr,2,f"='Rincian LO'!C{lsub[g]}/10^9"); dg.cell(rr,3,f"='Rincian LO'!D{lsub[g]}/10^9"); dg.cell(rr,4,f"=IF(C{rr}=0,0,B{rr}/C{rr}-1)")
    dg.cell(28,1,"Total Beban"); dg.cell(28,2,"=SUM(B24:B27)"); dg.cell(28,3,"=SUM(C24:C27)"); dg.cell(28,4,"=IF(C28=0,0,B28/C28-1)")
    sec(31,"4. Realisasi Belanja per Jenis"); hdr(dg,32,["Jenis belanja",f"Realisasi {Y}",f"Realisasi {Y-1}","Perubahan (%)"])
    # baris item di Rincian LRA: cari berdasarkan urutan
    item_rows = []
    rr_l = 5
    for g in GB:
        rr_l += 1
        for row in [x for x in br if x["kelompok"]==g]:
            item_rows.append((row["uraian"], rr_l)); rr_l += 1
        rr_l += 2
    for i,(nm,src) in enumerate(item_rows):
        rr = 33+i; dg.cell(rr,1,nm.replace("Belanja ","",1) if nm!="Belanja Tidak Terduga" else nm)
        dg.cell(rr,2,f"='Rincian LRA'!D{src}/10^9"); dg.cell(rr,3,f"='Rincian LRA'!F{src}/10^9"); dg.cell(rr,4,f"=IF(C{rr}=0,0,B{rr}/C{rr}-1)")
    last_item = 33+len(item_rows)-1
    data_rows = list(range(6,11))+list(range(15,20))+list(range(24,29))+list(range(33,last_item+1))
    for rr in data_rows:
        for c in range(1,5):
            cell = dg.cell(rr,c); cell.font = font(); cell.border = BOX
            if c in (2,3): cell.number_format = MIL
            if c == 4: cell.number_format = PCT
    for rr in range(15,20): dg.cell(rr,2).number_format = MIL; dg.cell(rr,3).number_format = '0.0%'
    for rr in (10,19,28):
        for c in range(1,5): dg.cell(rr,c).fill = fill(GREEN_L); dg.cell(rr,c).font = font(True)
    for col,w in zip("ABCD",[44,18,18,16]): dg.column_dimensions[col].width = w

    # ---------- Dashboard ----------
    dash.sheet_view.showGridLines = False
    for col in "ABCDEFGHIJKL": dash.column_dimensions[col].width = 13
    dash.merge_cells("A1:L1"); dash["A1"] = f"DASHBOARD KEUANGAN DAERAH – BELANJA DAN BEBAN TA {Y}"
    dash["A1"].font = font(True,"FFFFFF",15); dash["A1"].fill = fill(GREEN); dash["A1"].alignment = Alignment(vertical="center", indent=1); dash.row_dimensions[1].height = 50
    _lg = XLImage(os.path.join(HERE, "..", "assets", "logo-256.png")); _lg.height = 60; _lg.width = round(60*256/325)
    dash.add_image(_lg, "L1")
    dash.merge_cells("A2:L2"); dash["A2"] = "Pemerintah Kabupaten Gunungkidul · Sumber: LKPD (LRA dan LO) · Angka dalam Rp miliar kecuali dinyatakan lain"
    dash["A2"].font = font(False,"5A6B63",9,True); dash["A2"].alignment = Alignment(indent=1)
    tiles = [
      ("Realisasi Belanja (Rp miliar)", "='Data Grafik'!C10", MIL, "FF9A68", "total semua kelompok belanja"),
      ("Capaian Anggaran Belanja", "='Data Grafik'!D10", '0.00%', "0AC282", "realisasi ÷ anggaran"),
      ("Perubahan Belanja vs Tahun Lalu", f"=IF('Rincian LRA'!F{tot}=0,0,'Rincian LRA'!G{tot}/'Rincian LRA'!F{tot})", '+0.00%;-0.00%;0.00%', "FE5D70", f"dibanding realisasi {Y-1}"),
      ("Belanja Operasi (Rp miliar)", "='Data Grafik'!C6", MIL, "01A9AC", "pegawai, barang dan jasa, dll."),
      ("Belanja Modal (Rp miliar)", "='Data Grafik'!C7", MIL, "7E57C2", "tanah, mesin, gedung, jalan, dll."),
      ("Total Beban LO (Rp miliar)", "='Data Grafik'!B28", MIL, "4099FF", "Laporan Operasional"),
    ]
    for i,(lab,fm,nf,colr,note) in enumerate(tiles):
        r0 = 4 if i < 3 else 8; c0 = 1 + 4*(i % 3)
        for rr in range(r0, r0+3):
            dash.merge_cells(start_row=rr,start_column=c0,end_row=rr,end_column=c0+3)
            for cc in range(c0,c0+4): dash.cell(rr,cc).fill = fill(colr)
        a = dash.cell(r0,c0,lab); a.font = font(True,"FFFFFF",10); a.alignment = Alignment(indent=1, vertical="center")
        b = dash.cell(r0+1,c0,fm); b.font = font(True,"FFFFFF",22); b.number_format = nf; b.alignment = Alignment(indent=1, vertical="center", horizontal="left")
        d = dash.cell(r0+2,c0,note); d.font = font(False,"FFFFFF",8,True); d.alignment = Alignment(indent=1, vertical="center")
        dash.row_dimensions[r0].height = 20; dash.row_dimensions[r0+1].height = 34; dash.row_dimensions[r0+2].height = 16
    dash.row_dimensions[3].height = 8; dash.row_dimensions[7].height = 8; dash.row_dimensions[11].height = 8

    def style(ch, t, ytitle=None):
        ch.title = t; ch.roundedCorners = False; ch.width = 15.8; ch.height = 8.6
        if ch.legend is not None: ch.legend.overlay = False; ch.legend.position = "b"
        if ch.title is not None: ch.title.overlay = False
    c1 = BarChart(); c1.type = "col"; c1.grouping = "clustered"
    c1.add_data(Reference(dg,min_col=2,max_col=3,min_row=5,max_row=9), titles_from_data=True); c1.set_categories(Reference(dg,min_col=1,min_row=6,max_row=9))
    style(c1, f"Anggaran vs Realisasi Belanja {Y} (Rp miliar)"); c1.x_axis.delete=False; c1.y_axis.delete=False; c1.y_axis.majorGridlines = c1.y_axis.majorGridlines
    c1.series[0].graphicalProperties.solidFill = "B8C4BE"; c1.series[1].graphicalProperties.solidFill = GREEN
    dash.add_chart(c1, "A12")
    c2 = PieChart(); c2.add_data(Reference(dg,min_col=2,min_row=14,max_row=18), titles_from_data=True); c2.set_categories(Reference(dg,min_col=1,min_row=15,max_row=18))
    style(c2, f"Komposisi Realisasi Belanja {Y}"); c2.dataLabels = DataLabelList(); c2.dataLabels.showPercent = True; c2.dataLabels.showVal = False; c2.dataLabels.showCatName = False; c2.dataLabels.showSerName = False; c2.dataLabels.showLegendKey = False
    for idx,colr in enumerate(["1F6F54","FF9A68","B8C4BE","4099FF"]):
        pt = DataPoint(idx=idx); pt.graphicalProperties.solidFill = colr; c2.series[0].dPt.append(pt)
    dash.add_chart(c2, "G12")
    c3 = BarChart(); c3.type = "col"; c3.grouping = "clustered"
    c3.add_data(Reference(dg,min_col=2,max_col=3,min_row=23,max_row=27), titles_from_data=True); c3.set_categories(Reference(dg,min_col=1,min_row=24,max_row=27))
    style(c3, f"Beban (LO) per Kelompok: {Y} vs {Y-1} (Rp miliar)"); c3.x_axis.delete=False; c3.y_axis.delete=False
    c3.series[0].graphicalProperties.solidFill = "FF9A68"; c3.series[1].graphicalProperties.solidFill = "B8C4BE"
    dash.add_chart(c3, "A30")
    c4 = BarChart(); c4.type = "bar"; c4.grouping = "clustered"
    c4.add_data(Reference(dg,min_col=2,max_col=3,min_row=32,max_row=last_item), titles_from_data=True); c4.set_categories(Reference(dg,min_col=1,min_row=33,max_row=last_item))
    style(c4, f"Realisasi Belanja per Jenis: {Y} vs {Y-1} (Rp miliar)"); c4.height = 11.5; c4.x_axis.delete=False; c4.y_axis.delete=False
    c4.series[0].graphicalProperties.solidFill = GREEN; c4.series[1].graphicalProperties.solidFill = "B8C4BE"
    dash.add_chart(c4, "G30")

    # ---------- Catatan & Sumber ----------
    cat.column_dimensions["A"].width = 26; cat.column_dimensions["B"].width = 110
    title(cat, "CATATAN & SUMBER", "Baca sebelum memakai angka pada file ini.", 2)
    notes = [
      ("Sumber data", "Laporan Keuangan Pemerintah Daerah (LKPD) Pemerintah Kabupaten Gunungkidul: Laporan Realisasi Anggaran (LRA) dan Laporan Operasional (LO) untuk TA 2023, 2024 dan 2025 (dokumen PDF yang diberikan penyusun)."),
      ("Cakupan", "Hanya Belanja (LRA) dan Beban (LO). Pendapatan dan Pembiayaan tidak dimasukkan."),
      ("Satuan", "Sheet Rincian dalam rupiah. Sheet Data Grafik dan Dashboard dalam Rp miliar (rupiah ÷ 1.000.000.000)."),
      ("Cara hitung", "Capaian = Realisasi ÷ Anggaran. Subtotal dan total memakai rumus SUM. Perubahan (%) = (tahun ini − tahun lalu) ÷ tahun lalu. LO tidak memuat anggaran, sehingga tidak ada capaian."),
      ("Angka biru / hitam", "Angka biru pada Rincian LRA dan Rincian LO disalin dari dokumen sumber. Angka hitam adalah rumus."),
      ("Pembanding tahun lalu", f"Realisasi dan nilai {Y-1} diambil dari kolom pembanding pada dokumen sumber yang sama" + (" (kolom 2022 Audited pada LKPD 2023)." if Y==2023 else ".")),
      ("Status audit", "Pada dokumen sumber, LO 2023 dan LO 2024 berlabel 'Audited', sedangkan kolom tahun 2025 tidak berlabel 'Audited'. Periksa status audit sebelum mengutip angka 2025."),
      ("Penyajian kode rekening", "Kode rekening mengikuti penyajian LKPD 2024 dan 2025. Pada LKPD 2023 kode ditulis dengan huruf (misalnya 5.1.2.1.a), dan di sini dipetakan ke kode angka yang setara."),
      ("Validasi", "Setiap subtotal dan total pada dokumen sumber dicocokkan dengan jumlah dari rincian saat angka dimasukkan; seluruhnya sama sampai sen."),
      ("Dibuat", "22 November 2026, untuk dashboard keuangan daerah Kabupaten Gunungkidul."),
    ]
    if Y == 2025:
        notes.insert(7, ("Perlu diperhatikan", "Beban Bantuan Keuangan pada LO 2025 (Rp142,6 miliar) jauh lebih kecil daripada Belanja Bantuan Keuangan pada LRA 2025 (Rp311,2 miliar). Angka mengikuti dokumen sumber; penjelasannya perlu dicek pada Catatan atas Laporan Keuangan."))
    for i,(k,v) in enumerate(notes):
        rr = 4+i; cat.cell(rr,1,k).font = font(True); cat.cell(rr,2,v).font = font()
        cat.cell(rr,1).alignment = Alignment(vertical="top"); cat.cell(rr,2).alignment = Alignment(wrap_text=True, vertical="top")
        cat.row_dimensions[rr].height = 30 if len(v) > 105 else 18
    for ws in (lra, lo, dg, cat, dash):
        ws.page_setup.orientation = "landscape"; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True
    dash.page_setup.fitToHeight = 1
    path = f"{OUT}/Laporan-Belanja-dan-Beban-Gunungkidul-{Y}.xlsx"
    wb.save(path); return path

if __name__ == "__main__":
    for y in YEARS: print(build(y))
