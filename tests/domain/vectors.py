"""Literature test vectors V1-V10 from plan Section 20.11 (docs/VECTORS.md)."""

HDR = "Keys: x, y. Initial: x=0, y=0."
HDR_XYZ = "Keys: x, y, z. Initial: x=0, y=0, z=0."

V = {
    "V1_timed": HDR + """
T1  start=1  commit=6  r(x)=0  w(y)=1
T2  start=2  commit=5  r(y)=0  w(x)=1""",
    "V1_ordered": HDR + """
T2  commit=5  r(y)=0  w(x)=1
T1  commit=6  r(x)=0  w(y)=1""",
    "V2_timed": HDR + """
T1  start=1  commit=4  r(x)=0  w(x)=1
T2  start=2  commit=5  r(x)=0  w(x)=2""",
    "V2_ordered": HDR + """
T1  commit=4  r(x)=0  w(x)=1
T2  commit=5  r(x)=0  w(x)=2""",
    "V3_timed": HDR + """
T1  start=1  commit=6  r(x)=0  r(y)=2
T2  start=2  commit=4  w(x)=1  w(y)=2""",
    "V3_ordered": HDR + """
T2  commit=4  w(x)=1  w(y)=2
T1  commit=6  r(x)=0  r(y)=2""",
    "V4_timed": HDR + """
T1  start=1  commit=3  w(x)=1
T2  start=2  commit=4  r(x)=0""",
    "V4_ordered": HDR + """
T1  commit=3  w(x)=1
T2  commit=4  r(x)=0""",
    "V5_timed": HDR + """
T1  start=1  abort=2  w(x)=1
T2  start=3  commit=4  r(x)=1""",
    "V5_ordered": HDR + """
T1  abort  w(x)=1
T2  commit=4  r(x)=1""",
    "V6_timed": HDR + """
T1  start=1  commit=4  w(x)=1  w(x)=2
T2  start=5  commit=6  r(x)=1""",
    "V6_ordered": HDR + """
T1  commit=4  w(x)=1  w(x)=2
T2  commit=6  r(x)=1""",
    "V7_timed": HDR + """
T1  start=1  prepared commit_ts=4  w(x)=1
T2  start=5  commit=6  r(x)=1""",
    "V8_timed": HDR_XYZ + """
T1  start=1  prepared commit_ts=4  w(z)=1
T2  start=5  commit=6  r(x)=0  w(y)=1""",
    "V9_timed": HDR + """
T1  start=1  commit=3  w(x)=1  r(x)=1""",
    "V9_broken": HDR + """
T1  start=1  commit=3  w(x)=1  r(x)=0""",
    "V10_timed": HDR + """
T1  start=1  commit=3  w(x)=1
T2  start=4  commit=5  r(x)=1  w(x)=2""",
}
