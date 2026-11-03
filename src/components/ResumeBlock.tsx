import { resume } from '../data/resume'

/** 履历分区的档案正文：把个人简历渲染成宇宙飞船·档案风格的条目 */
export default function ResumeBlock() {
  return (
    <section className="resume" aria-label="履历档案">
      <div className="resume-head">
        <span className="resume-mark" aria-hidden="true" />
        <h3 className="resume-title">个人履历档案</h3>
        <span className="resume-sub">RESUME // 胧月夜 · 赵鹏</span>
      </div>

      {/* 基本信息 */}
      <div className="resume-grid">
        <div className="resume-cell">
          <span className="resume-k">&gt;&gt; 姓名</span>
          <span className="resume-v">{resume.name}</span>
        </div>
        <div className="resume-cell">
          <span className="resume-k">&gt;&gt; 昵称</span>
          <span className="resume-v">{resume.nickname}</span>
        </div>
        <div className="resume-cell">
          <span className="resume-k">&gt;&gt; 年龄</span>
          <span className="resume-v">{resume.age}</span>
        </div>
        <div className="resume-cell">
          <span className="resume-k">&gt;&gt; 性别</span>
          <span className="resume-v">{resume.gender}</span>
        </div>
      </div>

      {/* 身份标签 */}
      <div className="resume-block">
        <p className="resume-k">&gt;&gt; 身份标签</p>
        <div className="resume-tags">
          {resume.roles.map((r) => (
            <span className="resume-tag" key={r}>{r}</span>
          ))}
        </div>
      </div>

      {/* 学历 */}
      <div className="resume-block">
        <p className="resume-k">&gt;&gt; 学历</p>
        <ul className="resume-list">
          {resume.education.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>

      {/* 证书 */}
      <div className="resume-block">
        <p className="resume-k">&gt;&gt; 拥有证书</p>
        <div className="resume-tags">
          {resume.certificates.map((c) => (
            <span className="resume-tag" key={c}>{c}</span>
          ))}
        </div>
      </div>

      {/* 个人经历时间线 */}
      <div className="resume-block">
        <p className="resume-k">&gt;&gt; 个人经历</p>
        <ul className="resume-time">
          {resume.experiences.map((x, i) => (
            <li key={i} className="resume-time-item">
              <span className="resume-year">{x.year}</span>
              <span className="resume-dot" aria-hidden="true" />
              <span className="resume-text">{x.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 参与项目 */}
      <div className="resume-block">
        <p className="resume-k">&gt;&gt; 参与项目</p>
        <ul className="resume-proj">
          {resume.projects.map((p) => (
            <li key={p.name} className="resume-proj-item">
              <span className="resume-proj-name">{p.name}</span>
              <span className="resume-proj-note">{p.note}</span>
              <span className="resume-proj-role">{p.role}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 个人介绍 */}
      <div className="resume-block">
        <p className="resume-k">&gt;&gt; 个人介绍</p>
        <p className="resume-intro">{resume.intro}</p>
      </div>
    </section>
  )
}
