// TOTP RFC 6238 测试向量验证
// 运行: cargo run --example totp_verify
use totp_rs::{Algorithm, Secret, TOTP};

fn gen(secret_b32: &str, time: u64) -> String {
    let secret = Secret::Encoded(secret_b32.to_string());
    let bytes = secret.to_bytes().unwrap();
    let totp = TOTP::new(Algorithm::SHA1, 6, 0, 30, bytes).unwrap();
    totp.generate(time)
}

fn main() {
    // RFC 6238 附录 B 测试向量：ASCII "12345678901234567890" 的 Base32
    let secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    let cases = [
        (59u64, "287082"),
        (1111111109, "081804"),
        (1111111111, "050471"),
        (1234567890, "005924"),
        (2000000000, "279037"),
        (20000000000, "353130"),
    ];
    let mut all_ok = true;
    for (t, expected) in cases {
        let got = gen(secret, t);
        let ok = got == expected;
        all_ok &= ok;
        println!("T={:<12} expect={} got={} {}", t, expected, got, if ok { "✅" } else { "❌" });
    }
    println!("---");
    if all_ok {
        println!("✅ RFC 6238 全部测试向量通过");
    } else {
        println!("❌ 测试向量不匹配");
        std::process::exit(1);
    }
}
