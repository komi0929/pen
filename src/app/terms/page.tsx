import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in py-8">
          <h1 className="mb-8 text-2xl font-bold">利用規約</h1>

          <div className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed">
            <p className="text-muted-foreground">最終更新日: 2026年2月15日</p>

            <section>
              <h2 className="mb-3 text-lg font-bold">第1条（適用）</h2>
              <p>
                本利用規約（以下「本規約」）は、株式会社ヒトコト（以下「当社」）が提供するサービス「pen」（以下「本サービス」）の利用条件を定めるものです。ユーザーの皆様には、本規約に同意の上、本サービスをご利用いただきます。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">第2条（定義）</h2>
              <p>
                本規約において「ユーザー」とは、本サービスに登録し、利用する個人または法人を指します。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">
                第3条（アカウント登録）
              </h2>
              <ol className="list-decimal space-y-2 pl-6">
                <li>
                  ユーザーは、正確かつ最新の情報を提供してアカウント登録を行うものとします。
                </li>
                <li>
                  ユーザーは、自己のアカウント情報を適切に管理する義務を負います。
                </li>
                <li>
                  アカウントの不正利用により生じた損害について、当社は一切の責任を負いません。
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">第4条（禁止事項）</h2>
              <p>
                ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
              </p>
              <ol className="list-decimal space-y-2 pl-6">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>当社または第三者の知的財産権を侵害する行為</li>
                <li>当社のサーバーまたはネットワークの機能を妨害する行為</li>
                <li>本サービスの運営を妨害するおそれのある行為</li>
                <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                <li>不正アクセスをし、またはこれを試みる行為</li>
                <li>他のユーザーに成りすます行為</li>
                <li>反社会的勢力に対して直接または間接に利益を供与する行為</li>
                <li>その他、当社が不適切と判断する行為</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">
                第5条（本サービスの提供の停止等）
              </h2>
              <p>
                当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
              </p>
              <ol className="list-decimal space-y-2 pl-6">
                <li>
                  本サービスにかかるシステムの保守点検または更新を行う場合
                </li>
                <li>
                  地震、落雷、火災、停電またはその他の不可抗力により本サービスの提供が困難となった場合
                </li>
                <li>その他、当社が本サービスの提供が困難と判断した場合</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">第6条（著作権）</h2>
              <ol className="list-decimal space-y-2 pl-6">
                <li>
                  ユーザーが本サービスを利用して生成したコンテンツの著作権は、ユーザーに帰属します。
                </li>
                <li>
                  本サービスのUI、デザイン、ソフトウェア等の著作権は当社に帰属します。
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">第7条（免責事項）</h2>
              <ol className="list-decimal space-y-2 pl-6">
                <li>
                  当社は、本サービスに事実上または法律上の瑕疵がないことを明示的にも黙示的にも保証しておりません。
                </li>
                <li>
                  当社は、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。
                </li>
                <li>
                  AIにより生成されたコンテンツの正確性・適切性について、当社は保証しません。
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">
                第8条（サービス内容の変更等）
              </h2>
              <p>
                当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">
                第9条（利用規約の変更）
              </h2>
              <p>
                当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の利用規約は、本サービス上に掲示された時点で効力を生じるものとします。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">
                第10条（準拠法・裁判管轄）
              </h2>
              <p>
                本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
              </p>
            </section>

            <div className="border-border mt-8 border-t pt-6">
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
