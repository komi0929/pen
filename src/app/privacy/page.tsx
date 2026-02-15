import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-12 pb-8">
          <h1 className="mb-8 text-2xl font-bold">プライバシーポリシー</h1>

          <div className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed">
            <p className="text-muted-foreground">最終更新日: 2026年2月15日</p>

            <p>
              株式会社ヒトコト（以下「当社」）は、本サービス「pen」におけるユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
            </p>

            <section>
              <h2 className="mb-3 text-lg font-bold">1. 収集する情報</h2>
              <p>当社は、以下の情報を収集することがあります。</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>アカウント情報:</strong>{" "}
                  メールアドレス、表示名などの登録時に提供される情報
                </li>
                <li>
                  <strong>利用データ:</strong>{" "}
                  テーマ、メモ、インタビュー内容、生成された記事などのサービス利用に伴うデータ
                </li>
                <li>
                  <strong>アクセスログ:</strong>{" "}
                  IPアドレス、ブラウザ情報、アクセス日時などの技術的情報
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">2. 情報の利用目的</h2>
              <p>収集した情報は、以下の目的のために利用します。</p>
              <ol className="list-decimal space-y-2 pl-6">
                <li>本サービスの提供・運営・改善のため</li>
                <li>ユーザーサポートの提供のため</li>
                <li>利用規約に違反する行為への対応のため</li>
                <li>サービスに関するお知らせの送信のため</li>
                <li>統計データの作成・分析のため（個人を特定できない形式）</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">3. 第三者への提供</h2>
              <p>
                当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
              </p>
              <ol className="list-decimal space-y-2 pl-6">
                <li>ユーザーの同意がある場合</li>
                <li>法令に基づく場合</li>
                <li>人の生命、身体または財産の保護のために必要な場合</li>
                <li>
                  サービスの提供に必要な業務委託先に対して提供する場合（適切な管理を行います）
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">4. 外部サービスの利用</h2>
              <p>本サービスでは、以下の外部サービスを利用しています。</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>Supabase:</strong>{" "}
                  認証・データベースサービスとして利用。ユーザーデータの保管に使用します。
                </li>
                <li>
                  <strong>Google Gemini API:</strong>{" "}
                  AIインタビュー・記事生成のために利用。ユーザーの入力内容がAPIに送信されます。
                </li>
                <li>
                  <strong>Vercel:</strong>{" "}
                  ホスティングサービスとして利用。アクセスログが収集されます。
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">
                5. データの保管と安全管理
              </h2>
              <p>
                当社は、収集した個人情報の漏洩、滅失、毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  データは暗号化された通信（HTTPS）を通じてやり取りされます
                </li>
                <li>
                  データベースにはRow Level Security（RLS）を適用しています
                </li>
                <li>パスワードは暗号化して保存されます</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">6. ユーザーの権利</h2>
              <p>ユーザーは、以下の権利を有します。</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>自己の個人情報の開示を請求する権利</li>
                <li>自己の個人情報の訂正・削除を請求する権利</li>
                <li>アカウントの削除を請求する権利</li>
              </ul>
              <p>
                上記の請求については、当社所定の方法によりお問い合わせください。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">
                7. プライバシーポリシーの変更
              </h2>
              <p>
                当社は、必要に応じて本ポリシーを変更することがあります。変更後のポリシーは、本サービス上に掲示された時点から効力を生じるものとします。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">8. お問い合わせ</h2>
              <p>本ポリシーに関するお問い合わせは、以下までご連絡ください。</p>
            </section>

            <div className="mt-8 pt-6">
              <p className="font-bold">運営会社</p>
              <p>株式会社ヒトコト</p>
              <p>代表者: 小南優作</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
