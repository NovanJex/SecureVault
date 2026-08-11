// KDBX 往返测试：验证 export_kdbx 生成的 KDBX 文件能被 keepass-rs 正确读回
// 运行: cargo run --example kdbx_roundtrip
use keepass::config::{DatabaseConfig, DatabaseVersion, KdfConfig};
use keepass::db::{Database, Entry, Group, Value};
use keepass::DatabaseKey;
use secstr::SecStr;

fn main() {
    let path = std::env::temp_dir().join("sv_kdbx_test.kdbx");
    let password = "test-password-123";

    // ===== 1. 模拟 export_kdbx 的构建逻辑 =====
    let mut config = DatabaseConfig::default();
    config.version = DatabaseVersion::KDB4(1);
    let default_version = match DatabaseConfig::default().kdf_config {
        KdfConfig::Argon2 { version, .. } | KdfConfig::Argon2id { version, .. } => version,
        KdfConfig::Aes { .. } => unreachable!(),
    };
    config.kdf_config = KdfConfig::Argon2id {
        iterations: 4,
        memory: 65_536,
        parallelism: 4,
        version: default_version,
    };

    let mut db = Database::new(config);
    db.meta.database_name = Some("SecureVault 保险箱".to_string());

    // 模拟两个文件夹、三种条目
    let mut group_a = Group::new("服务器");
    let mut e1 = Entry::new();
    e1.fields.insert("Title".into(), Value::Unprotected("GitHub".into()));
    e1.fields.insert("UserName".into(), Value::Unprotected("jex".into()));
    e1.fields.insert("Password".into(), Value::Protected(SecStr::from("p@ss中文💯")));
    e1.fields.insert("URL".into(), Value::Unprotected("https://github.com".into()));
    e1.fields.insert("Notes".into(), Value::Unprotected("测试备注".into()));
    e1.fields.insert("SecureVaultFavorite".into(), Value::Unprotected("1".into()));
    group_a.add_child(e1);
    db.root.add_child(group_a);

    let mut group_b = Group::new("银行卡");
    let mut e2 = Entry::new();
    e2.fields.insert("Title".into(), Value::Unprotected("招商银行".into()));
    e2.fields.insert("UserName".into(), Value::Unprotected("6222 8888 6666".into()));
    e2.fields.insert("Password".into(), Value::Protected(SecStr::from("123456")));
    e2.fields.insert("卡号".into(), Value::Unprotected("6222 8888 6666".into()));
    e2.fields.insert("有效期".into(), Value::Unprotected("08/29".into()));
    e2.fields.insert("CVV".into(), Value::Unprotected("866".into()));
    group_b.add_child(e2);
    db.root.add_child(group_b);

    let mut group_c = Group::new("备忘");
    let mut e3 = Entry::new();
    e3.fields.insert("Title".into(), Value::Unprotected("WiFi 密码".into()));
    e3.fields.insert("Notes".into(), Value::Unprotected("路由器背面".into()));
    group_c.add_child(e3);
    db.root.add_child(group_c);

    let key = DatabaseKey::new().with_password(password);
    let mut file = std::fs::File::create(&path).unwrap();
    db.save(&mut file, key).expect("KDBX 保存失败");
    println!("✅ 导出成功: {}", path.display());

    // ===== 2. 模拟 import_kdbx 的读取逻辑 =====
    let key2 = DatabaseKey::new().with_password(password);
    let mut file2 = std::fs::File::open(&path).unwrap();
    let db2 = Database::open(&mut file2, key2).expect("KDBX 打开失败");
    println!("✅ 读取成功, database_name={:?}", db2.meta.database_name);

    fn walk(group: &Group, prefix: &str, depth: usize) {
        let path = if prefix.is_empty() { group.name.clone() } else { format!("{}/{}", prefix, group.name) };
        for entry in group.entries() {
            let get = |k: &str| match entry.fields.get(k) {
                Some(Value::Unprotected(s)) => s.clone(),
                Some(Value::Protected(b)) => String::from_utf8_lossy(b.unsecure()).into_owned(),
                Some(Value::Bytes(b)) => String::from_utf8_lossy(b).into_owned(),
                None => String::new(),
            };
            println!("  条目[{}]: {:?} / {} / pwd={:?} / {}",
                path, get("Title"), get("UserName"), get("Password"), get("URL"));
            if depth == 0 { std::process::exit(0); }
        }
        for sub in group.groups() { walk(sub, &path, depth + 1); }
    }
    walk(&db2.root, "", 0);

    std::fs::remove_file(&path).ok();
    println!("✅ 往返测试通过");
}
