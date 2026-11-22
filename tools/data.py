# Data LKPD Kabupaten Gunungkidul — disalin dari PDF (LRA & LO) yang dikirim pengguna.
# Format angka mengikuti PDF (titik ribuan, koma desimal) agar mudah dicocokkan ulang.
def n(s):
    s = s.strip()
    if s in ("-", ""): return 0.0
    neg = s.startswith("(")
    s = s.strip("()").replace(".", "").replace(",", ".")
    v = float(s)
    return -v if neg else v

YEARS = [2023, 2024, 2025]           # tahun dashboard
PREV  = 2022                          # pembanding untuk 2023

# ---------- BELANJA (LRA) ----------
# (kode, kelompok, uraian, [anggaran 2023, 2024, 2025], [realisasi 2022, 2023, 2024, 2025])
B = [
("5.1.2.1.1","Belanja Operasi","Belanja Pegawai",
 ["853.443.622.697,00","1.008.602.686.988,00","1.035.192.176.413,67"],
 ["826.287.498.713,00","839.785.150.907,00","975.707.383.549,00","981.150.240.802,00"]),
("5.1.2.1.2","Belanja Operasi","Belanja Barang dan Jasa",
 ["563.480.576.709,00","589.960.136.412,35","551.687.408.874,96"],
 ["500.452.445.773,56","531.453.185.475,10","555.478.292.630,00","519.291.383.895,93"]),
("5.1.2.1.3","Belanja Operasi","Belanja Subsidi",
 ["270.000.000,00","550.000.000,00","350.000.000,00"],
 ["1.437.202.577,00","269.872.500,00","496.472.534,00","337.003.323,00"]),
("5.1.2.1.4","Belanja Operasi","Belanja Hibah",
 ["73.157.751.628,00","72.766.877.363,00","58.960.150.694,19"],
 ["57.152.607.491,00","71.692.177.954,00","73.716.299.046,00","57.606.358.684,00"]),
("5.1.2.1.5","Belanja Operasi","Belanja Bantuan Sosial",
 ["16.675.450.000,00","12.907.488.000,00","9.002.428.400,00"],
 ["18.710.519.387,00","16.631.362.268,00","12.595.181.550,00","8.938.122.747,00"]),
("5.1.2.2.1","Belanja Modal","Belanja Modal Tanah",
 ["5.415.827.500,00","3.971.360.625,65","2.907.765.000,00"],
 ["5.366.354.820,00","4.510.814.335,00","3.090.672.378,00","2.714.839.334,00"]),
("5.1.2.2.2","Belanja Modal","Belanja Modal Peralatan dan Mesin",
 ["45.585.234.753,00","45.555.868.377,00","32.669.584.774,00"],
 ["109.055.394.711,00","42.951.484.642,00","43.547.548.790,00","30.242.313.642,00"]),
("5.1.2.2.3","Belanja Modal","Belanja Modal Gedung dan Bangunan",
 ["93.986.597.141,00","61.680.495.330,00","59.099.380.973,00"],
 ["69.278.521.126,45","80.119.934.255,00","54.498.407.639,00","51.994.517.869,00"]),
("5.1.2.2.4","Belanja Modal","Belanja Modal Jalan, Jaringan, dan Irigasi",
 ["42.806.483.233,00","33.667.699.159,00","23.823.221.856,00"],
 ["79.328.069.800,00","40.332.789.870,00","32.039.904.950,00","22.489.544.483,00"]),
("5.1.2.2.5","Belanja Modal","Belanja Modal Aset Tetap Lainnya",
 ["10.161.726.919,00","6.500.903.472,00","7.163.150.504,00"],
 ["6.114.846.943,00","10.001.111.569,00","6.264.343.061,00","7.085.686.037,00"]),
("5.1.2.2.6","Belanja Modal","Belanja Modal Aset Lainnya",
 ["-","3.419.300.000,00","2.731.608.550,00"],
 ["55.942.100,00","-","3.331.002.227,00","2.682.415.541,00"]),
("5.1.2.3","Belanja Tidak Terduga","Belanja Tidak Terduga",
 ["1.048.541.123,00","9.420.726.095,76","9.209.645.561,70"],
 ["10.131.998.741,62","235.998.075,00","296.252.086,00","142.400.000,00"]),
("5.1.2.4.1","Belanja Transfer","Belanja Bagi Hasil",
 ["16.416.635.450,00","17.853.205.575,00","26.401.738.100,00"],
 ["14.194.807.550,00","14.768.381.250,00","17.572.749.175,00","24.908.176.950,00"]),
("5.1.2.4.2","Belanja Transfer","Belanja Bantuan Keuangan",
 ["348.203.476.650,00","313.417.178.600,00","311.418.260.600,00"],
 ["308.885.310.880,00","348.148.476.650,00","313.413.428.600,00","311.192.118.184,00"]),
]
# Total yang TERTULIS di PDF (untuk validasi): kelompok -> (anggaran[3], realisasi[4])
B_TOT = {
"Belanja Operasi": (["1.507.027.401.034,00","1.684.787.188.763,35","1.655.192.164.382,82"],
  ["1.404.040.273.941,56","1.459.831.749.104,10","1.617.993.629.309,00","1.567.323.109.451,93"]),
"Belanja Modal": (["197.955.869.546,00","154.795.626.963,65","128.394.711.657,00"],
  ["269.199.129.500,45","177.916.134.671,00","142.771.879.045,00","117.209.316.906,00"]),
"Belanja Tidak Terduga": (["1.048.541.123,00","9.420.726.095,76","9.209.645.561,70"],
  ["10.131.998.741,62","235.998.075,00","296.252.086,00","142.400.000,00"]),
"Belanja Transfer": (["364.620.112.100,00","331.270.384.175,00","337.819.998.700,00"],
  ["323.080.118.430,00","362.916.857.900,00","330.986.177.775,00","336.100.295.134,00"]),
"JUMLAH BELANJA": (["2.070.651.923.803,00","2.180.273.925.997,76","2.130.616.520.301,52"],
  ["2.006.451.520.613,63","2.000.900.739.750,10","2.092.047.938.215,00","2.020.775.121.491,93"]),
}

# ---------- BEBAN (LO) ----------
# (kode, kelompok, uraian, [2022, 2023, 2024, 2025])
L = [
("5.4.2.1.1","Beban Operasi","Beban Pegawai",["821.459.464.164,00","864.370.681.629,00","951.671.321.649,00","982.014.823.853,00"]),
("5.4.2.1.2","Beban Operasi","Beban Barang dan Jasa",["514.703.718.622,70","565.894.679.492,26","580.514.917.044,18","551.036.026.155,76"]),
("5.4.2.1.3","Beban Operasi","Beban Subsidi",["1.437.202.577,00","269.872.500,00","496.472.534,00","337.003.323,00"]),
("5.4.2.1.4","Beban Operasi","Beban Hibah",["58.885.331.885,34","72.492.986.935,00","73.335.526.885,00","58.989.548.062,00"]),
("5.4.2.1.5","Beban Operasi","Beban Bantuan Sosial",["18.710.519.387,00","16.650.562.268,00","12.620.831.550,00","8.962.422.747,00"]),
("5.4.2.1.6","Beban Operasi","Beban Penyisihan Piutang",["2.656.989.171,11","2.719.502.411,11","4.118.071.461,71","4.034.087.850,00"]),
("5.4.2.2.1","Beban Penyusutan dan Amortisasi","Beban Penyusutan Peralatan dan Mesin",["73.826.153.754,23","80.627.328.270,33","73.946.388.798,10","66.975.770.641,82"]),
("5.4.2.2.2","Beban Penyusutan dan Amortisasi","Beban Penyusutan Gedung dan Bangunan",["26.220.562.619,89","26.981.358.430,06","23.922.744.896,96","23.926.855.341,16"]),
("5.4.2.2.3","Beban Penyusutan dan Amortisasi","Beban Penyusutan Jalan, Irigasi dan Jaringan",["80.502.092.990,79","82.443.953.268,31","86.497.160.988,95","71.781.227.329,99"]),
("5.4.2.2.4","Beban Penyusutan dan Amortisasi","Beban Penyusutan Aset Tetap Lainnya",["-","-","109.388.400,00","-"]),
("5.4.2.2.5","Beban Penyusutan dan Amortisasi","Beban Penyusutan Aset Lainnya",["47.596.428,48","1.383.853.891,88","1.449.033.799,50","1.726.132.241,70"]),
("5.4.2.2.6","Beban Penyusutan dan Amortisasi","Beban Amortisasi Aset Tak Berwujud",["4.203.807.719,92","5.008.391.424,54","5.206.566.494,45","4.954.249.458,43"]),
("5.4.2.2.7","Beban Penyusutan dan Amortisasi","Beban Penyusutan Properti Investasi",["-","-","4.164.234.077,49","4.270.437.415,00"]),
("5.4.2.3.1","Beban Transfer","Beban Bagi Hasil",["14.328.084.450,00","16.279.331.294,71","24.515.822.463,00","23.102.983.650,00"]),
("5.4.2.3.2","Beban Transfer","Beban Bantuan Keuangan",["308.885.310.880,00","348.148.476.650,00","313.413.428.600,00","142.605.751.600,00"]),
("5.4.2.4.1","Beban Tak Terduga","Beban Tak Terduga",["7.402.380.018,45","704.311.746,62","458.730.817,98","142.400.000,00"]),
]
L_TOT = {
"Beban Operasi": ["1.417.853.225.807,15","1.522.398.285.235,37","1.622.757.141.123,89","1.605.373.911.990,76"],
"Beban Penyusutan dan Amortisasi": ["184.800.213.513,31","196.444.885.285,12","195.295.517.455,45","173.634.672.428,10"],
"Beban Transfer": ["323.213.395.330,00","364.427.807.944,71","337.929.251.063,00","165.708.735.250,00"],
"Beban Tak Terduga": ["7.402.380.018,45","704.311.746,62","458.730.817,98","142.400.000,00"],
"JUMLAH BEBAN": ["1.933.269.214.668,91","2.083.975.290.211,82","2.156.440.640.460,32","1.944.859.719.668,86"],
}

def belanja_rows():
    return [dict(kode=k, kelompok=g, uraian=u, anggaran=[n(x) for x in a], realisasi=[n(x) for x in r]) for k,g,u,a,r in B]
def beban_rows():
    return [dict(kode=k, kelompok=g, uraian=u, nilai=[n(x) for x in v]) for k,g,u,v in L]

def validate():
    ok = True
    br, lr = belanja_rows(), beban_rows()
    def close(a,b): return abs(a-b) < 0.011
    for g,(ta,tr) in B_TOT.items():
        rows = br if g=="JUMLAH BELANJA" else [r for r in br if r["kelompok"]==g]
        for i in range(3):
            s = sum(r["anggaran"][i] for r in rows)
            if not close(s, n(ta[i])): ok=False; print("BEDA anggaran", g, YEARS[i], round(s,2), n(ta[i]))
        for i in range(4):
            s = sum(r["realisasi"][i] for r in rows)
            if not close(s, n(tr[i])): ok=False; print("BEDA realisasi", g, [2022]+YEARS and ([2022]+YEARS)[i], round(s,2), n(tr[i]))
    for g,t in L_TOT.items():
        rows = lr if g=="JUMLAH BEBAN" else [r for r in lr if r["kelompok"]==g]
        for i in range(4):
            s = sum(r["nilai"][i] for r in rows)
            if not close(s, n(t[i])): ok=False; print("BEDA beban", g, ([2022]+YEARS)[i], round(s,2), n(t[i]))
    return ok

if __name__ == "__main__":
    print("VALID" if validate() else "ADA PERBEDAAN")
