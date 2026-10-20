/*
 * 多语言（i18n）。覆盖当前世界用户量最大的语言。
 * 默认按浏览器语言自动选择；用户也可手动切换。
 * 结构：I18N.dict[lang][key]；I18N.t(key) 取当前语言，缺失则回退英文。
 */
(function (root) {
  'use strict';

  // 语言元信息（显示名 + 是否 RTL）
  const LANGS = [
    { code: 'en', name: 'English', rtl: false },
    { code: 'zh', name: '简体中文', rtl: false },
    { code: 'zh-Hant', name: '繁體中文', rtl: false },
    { code: 'es', name: 'Español', rtl: false },
    { code: 'pt', name: 'Português', rtl: false },
    { code: 'fr', name: 'Français', rtl: false },
    { code: 'de', name: 'Deutsch', rtl: false },
    { code: 'ja', name: '日本語', rtl: false },
    { code: 'ko', name: '한국어', rtl: false },
    { code: 'ru', name: 'Русский', rtl: false },
    { code: 'ar', name: 'العربية', rtl: true }
  ];

  const D = {
    en: {
      appTitle: 'Sokoban · Box Pusher', tagline: 'Push every box onto a target. 30,000,000+ levels.',
      start: 'Start', resume: 'Continue', level: 'Level', of: 'of', moves: 'Moves', pushes: 'Pushes',
      best: 'Best', par: 'Target', undo: 'Undo', reset: 'Reset', prev: 'Prev', next: 'Next',
      winTitle: 'Level Cleared!', winBody: 'Nicely done.', nextLevel: 'Next Level', keepPlaying: 'Keep Playing',
      allClearTitle: 'Amazing!', allClearBody: 'You cleared a huge milestone. Keep going — there are 30,000,000 levels.',
      login: 'Sign In', register: 'Sign Up', account: 'Account', logout: 'Sign Out',
      emailPlaceholder: 'Your email', codePlaceholder: '6-char code', sendCode: 'Send Code', verifyPlay: 'Verify & Play',
      progressSaved: 'Progress saved to your account.', progressLoaded: 'Progress loaded.',
      langLabel: 'Language', difficultyLabel: 'Difficulty',
      easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert',
      hint: 'Hint', install: 'Install App', settings: 'Settings', sound: 'Sound', volume: 'Volume', tone: 'Tone (Hz)',
      close: 'Close', jump: 'Go to level', goTo: 'Go', signInTitle: 'Sign In', signUpTitle: 'Create Account',
      sendCodeFirst: 'Enter your email and we will send a 6-character code.', codeSent: 'Code sent! Check your inbox.',
      invalidCode: 'Wrong code. Try again.', codeExpired: 'Code expired. Please request a new one.',
      needLogin: 'Sign in to sync your progress across devices.', playAsGuest: 'Play as Guest',
      emailInvalid: 'Please enter a valid email.', backToMenu: 'Back', thankYou: 'Thanks for playing!',
      loading: 'Loading…', of2: 'of', adLabel: 'Advertisement', startTitle: 'Sokoban', startBody: 'A relaxing puzzle. Push all boxes onto the targets.', best_is: 'Best',
      leaderboard: 'Leaderboard', lbHint: "Updates daily at 8:00 with yesterday's progress.",
      lbNeedBackend: 'Leaderboard requires the account backend to be connected.', lbEmpty: 'No entries yet — be the first!',
      lbMaxLevel: 'Max Level', lbYesterday: 'Yesterday',
      nickname: 'Nickname', nicknamePlaceholder: '2-16 chars',
      nicknameHint: 'Your nickname (never your email) is shown on the leaderboard.',
      nicknameSaved: 'Nickname saved.', nicknameTaken: 'This nickname is already taken.',
      nicknameInvalid: 'Use 2-16 letters, numbers, CJK, _ or -.',
      save: 'Save', bannedMsg: 'This account has been banned for abnormal play. Contact support if you think this is a mistake.',
      cheatMsg: 'This result could not be verified and was not recorded.',
      storyBody: 'Story: you are the night-shift operator of an AI work-monitoring system. A glitch scattered the system\u2019s "job crates" across the warehouse \u2014 push every crate back onto its monitoring checkpoint so the AI can watch them run again.',
      storyTitle: 'Story',
      story: 'Story', share: 'Share', linkCopied: 'Link copied! Send it to your friends.',
      scan: 'Scan', scanTitle: 'Scan to Download',
      scanDesc: 'Open your phone camera and scan the code to open the game on your phone, then install it as an app.',
      scanAndroid: 'Android: tap "Install App" in the game to add it to your home screen.',
      scanIos: 'iPhone: tap Share → "Add to Home Screen".',
      copyLink: 'Copy Link',
      iosInstallHint: 'On iPhone/iPad (Safari): tap the Share button, then "Add to Home Screen" to install as an app.',
      guestHint: 'Progress is saved automatically on this device (guest mode). Account system coming soon.',
      resumeInfo: 'Welcome back — continue from Level {n} ({done} cleared).',
      guestMode: 'Guest Mode (no account needed)',
      deviceId: 'Device ID', reachLevelLabel: 'Highest level cleared', clearedCount: 'Levels cleared',
      levelLocked: 'Clear the previous level to unlock this one.',
      cloudOn: 'Cloud sync on (progress saved online)', cloudOff: 'Cloud sync off (local only)',
      lbNoteSelf: 'Self-reported by players; verified ranking arrives with the account system.',
      legendTarget: 'Goal', legendBox: 'Box', legendBoxOn: 'In place', legendObstacle: 'Obstacle', legendPlayer: 'You',
      accountSoon: 'Full account (cross-device sync, verified leaderboard) is coming.'
    },
    zh: {
      appTitle: '推箱子 · 搬运工', tagline: '把所有箱子推到目标点。3000 万+ 关卡。',
      start: '开始游戏', resume: '继续', level: '关卡', of: '/', moves: '步数', pushes: '推动',
      best: '最佳', par: '目标', undo: '撤销', reset: '重来', prev: '上一关', next: '下一关',
      winTitle: '过关！', winBody: '干得漂亮。', nextLevel: '下一关', keepPlaying: '继续游戏',
      allClearTitle: '太强了！', allClearBody: '你跨过一个巨大的里程碑。继续——这里共有 3000 万关。',
      login: '登录', register: '注册', account: '账号', logout: '退出登录',
      emailPlaceholder: '你的邮箱', codePlaceholder: '6 位验证码', sendCode: '发送验证码', verifyPlay: '验证并开始',
      progressSaved: '进度已保存到账号。', progressLoaded: '进度已加载。',
      langLabel: '语言', difficultyLabel: '难度',
      easy: '简单', medium: '中等', hard: '困难', expert: '专家',
      hint: '提示', install: '安装应用', settings: '设置', sound: '音效', volume: '音量', tone: '音色(Hz)',
      close: '关闭', jump: '跳到关卡', goTo: '前往', signInTitle: '登录', signUpTitle: '创建账号',
      sendCodeFirst: '输入邮箱，我们会发送一个 6 位验证码。', codeSent: '验证码已发送！请查收邮箱。',
      invalidCode: '验证码错误，请重试。', codeExpired: '验证码已过期，请重新获取。',
      needLogin: '登录后可在多设备同步进度。', playAsGuest: '以游客身份游玩',
      emailInvalid: '请输入有效的邮箱。', backToMenu: '返回', thankYou: '感谢游玩！',
      loading: '加载中…', of2: '/', adLabel: '广告', startTitle: '推箱子', startBody: '一个轻松的益智游戏。把所有箱子推到目标点。', best_is: '最佳',
      leaderboard: '排行榜', lbHint: '每天 8:00 更新前一天的游戏进度。',
      lbNeedBackend: '排行榜需要先连接账号后台。', lbEmpty: '还没有人上榜——来做第一个！',
      lbMaxLevel: '最高关卡', lbYesterday: '昨日新增',
      nickname: '昵称', nicknamePlaceholder: '2-16 个字符',
      nicknameHint: '排行榜只展示昵称，绝不展示你的邮箱。',
      nicknameSaved: '昵称已保存。', nicknameTaken: '这个昵称已被占用。',
      nicknameInvalid: '请用 2-16 个字母、数字、中文、_ 或 -。',
      save: '保存', bannedMsg: '该账号因异常操作已被封禁。如认为是误判请联系管理员。',
      cheatMsg: '该成绩未能通过验证，未计入排行榜。',
      storyBody: '背景故事：你是"AI 干活监控系统"的夜班运维员。系统故障把监控任务的"作业箱"散落了一仓库——把每个箱子推回对应的监控点，让 AI 重新盯住它们干活。',
      guestHint: '进度已自动保存在本机（游客模式）。账号系统开发中。',
      resumeInfo: '欢迎回来 —— 从第 {n} 关继续（已通关 {done} 关）。',
      guestMode: '游客模式（无需账号）',
      deviceId: '设备 ID', reachLevelLabel: '最高通关关卡', clearedCount: '已通关数',
      levelLocked: '先通关上一关，才能解锁这一关。',
      cloudOn: '云端同步已开启（进度已存到云端）', cloudOff: '云端同步未开启（仅本机）',
      lbNoteSelf: '数据由玩家自行上报；带验证的排行榜将在账号系统上线后提供。',
      legendTarget: '终点', legendBox: '箱子', legendBoxOn: '已到位', legendObstacle: '障碍', legendPlayer: '你',
      accountSoon: '完整账号（多端同步、已验证排行榜）正在开发中。',
      storyTitle: '背景故事',
      story: '背景故事', share: '分享', linkCopied: '链接已复制！发给你的朋友吧。',
      scan: '扫码', scanTitle: '扫码下载',
      scanDesc: '用手机相机扫一下下面的二维码，在手机上打开游戏，即可安装为 App 离线玩。',
      scanAndroid: '安卓：打开后点游戏里的"安装应用"，添加到桌面。',
      scanIos: '苹果：打开后点"分享"→"添加到主屏幕"。',
      copyLink: '复制链接',
      iosInstallHint: 'iPhone/iPad（Safari）：点"分享"按钮，再选"添加到主屏幕"，即可作为 App 安装。'
    },
    'zh-Hant': {
      appTitle: '推箱子 · 搬運工', tagline: '把所有箱子推到目標點。3000 萬+ 關卡。',
      start: '開始遊戲', resume: '繼續', level: '關卡', of: '/', moves: '步數', pushes: '推動',
      best: '最佳', par: '目標', undo: '復原', reset: '重來', prev: '上一關', next: '下一關',
      winTitle: '過關！', winBody: '幹得漂亮。', nextLevel: '下一關', keepPlaying: '繼續遊戲',
      allClearTitle: '太強了！', allClearBody: '你跨過一個巨大的里程碑。繼續——這裡共有 3000 萬關。',
      login: '登入', register: '註冊', account: '帳號', logout: '登出',
      emailPlaceholder: '你的信箱', codePlaceholder: '6 位驗證碼', sendCode: '發送驗證碼', verifyPlay: '驗證並開始',
      progressSaved: '進度已儲存到帳號。', progressLoaded: '進度已載入。',
      langLabel: '語言', difficultyLabel: '難度',
      easy: '簡單', medium: '中等', hard: '困難', expert: '專家',
      hint: '提示', install: '安裝應用', settings: '設定', sound: '音效', volume: '音量', tone: '音色(Hz)',
      close: '關閉', jump: '跳到關卡', goTo: '前往', signInTitle: '登入', signUpTitle: '建立帳號',
      sendCodeFirst: '輸入信箱，我們會發送一個 6 位驗證碼。', codeSent: '驗證碼已發送！請查收信箱。',
      invalidCode: '驗證碼錯誤，請重試。', codeExpired: '驗證碼已過期，請重新取得。',
      needLogin: '登入後可在多裝置同步進度。', playAsGuest: '以訪客身分遊玩',
      emailInvalid: '請輸入有效的信箱。', backToMenu: '返回', thankYou: '感謝遊玩！',
      loading: '載入中…', of2: '/', adLabel: '廣告', startTitle: '推箱子', startBody: '一個輕鬆的益智遊戲。把所有箱子推到目標點。', best_is: '最佳',
      storyTitle: '背景故事',
      story: '背景故事', share: '分享', linkCopied: '連結已複製！發給你的朋友吧。',
      iosInstallHint: 'iPhone/iPad（Safari）：點「分享」按鈕，再選「加入主畫面」，即可作為 App 安裝。',
      storyBody: '背景故事：你是「AI 幹活監控系統」的夜班維運員。系統故障把監控任務的「作業箱」散落了一倉庫——把每個箱子推回對應的監控點，讓 AI 重新盯住它們幹活。'
    },
    es: {
      appTitle: 'Sokoban · Empuja', tagline: 'Empuja todas las cajas al objetivo. ¡Más de 30.000.000 de niveles!',
      start: 'Empezar', resume: 'Continuar', level: 'Nivel', of: 'de', moves: 'Movimientos', pushes: 'Empujes',
      best: 'Mejor', par: 'Meta', undo: 'Deshacer', reset: 'Reiniciar', prev: 'Ant', next: 'Sig',
      winTitle: '¡Nivel superado!', winBody: 'Bien hecho.', nextLevel: 'Siguiente', keepPlaying: 'Seguir jugando',
      allClearTitle: '¡Increíble!', allClearBody: 'Superaste un gran hito. Hay 30.000.000 de niveles.',
      login: 'Entrar', register: 'Registrarse', account: 'Cuenta', logout: 'Salir',
      emailPlaceholder: 'Tu correo', codePlaceholder: 'Código de 6', sendCode: 'Enviar código', verifyPlay: 'Verificar y jugar',
      progressSaved: 'Progreso guardado en tu cuenta.', progressLoaded: 'Progreso cargado.',
      langLabel: 'Idioma', difficultyLabel: 'Dificultad',
      easy: 'Fácil', medium: 'Medio', hard: 'Difícil', expert: 'Experto',
      hint: 'Pista', install: 'Instalar App', settings: 'Ajustes', sound: 'Sonido', volume: 'Volumen', tone: 'Tono (Hz)',
      close: 'Cerrar', jump: 'Ir al nivel', goTo: 'Ir', signInTitle: 'Entrar', signUpTitle: 'Crear cuenta',
      sendCodeFirst: 'Escribe tu correo y te enviaremos un código de 6 caracteres.', codeSent: '¡Código enviado! Revisa tu correo.',
      invalidCode: 'Código incorrecto. Intenta de nuevo.', codeExpired: 'Código expirado. Solicita uno nuevo.',
      needLogin: 'Inicia sesión para sincronizar tu progreso.', playAsGuest: 'Jugar como invitado',
      emailInvalid: 'Introduce un correo válido.', backToMenu: 'Volver', thankYou: '¡Gracias por jugar!',
      loading: 'Cargando…', of2: 'de', adLabel: 'Anuncio', startTitle: 'Sokoban', startBody: 'Un rompecabezas relajante. Empuja todas las cajas al objetivo.', best_is: 'Mejor',
      storyTitle: 'Historia',
      story: 'Historia', share: 'Compartir', linkCopied: '¡Enlace copiado! Mándaselo a tus amigos.',
      iosInstallHint: 'En iPhone/iPad (Safari): toca el botón Compartir y luego "Añadir a pantalla de inicio" para instalarlo como app.',
      storyBody: 'Historia: eres el operador del turno nocturno de un sistema de monitorización de trabajo con IA. Un fallo dispersó las "cajas de tareas" del sistema por el almacén — empuja cada caja de vuelta a su punto de control para que la IA pueda vigilarlas de nuevo.'
    },
    pt: {
      appTitle: 'Sokoban · Empurra', tagline: 'Empurre todas as caixas para o alvo. Mais de 30.000.000 de níveis!',
      start: 'Iniciar', resume: 'Continuar', level: 'Nível', of: 'de', moves: 'Movimentos', pushes: 'Empurrões',
      best: 'Melhor', par: 'Meta', undo: 'Desfazer', reset: 'Reiniciar', prev: 'Ant', next: 'Próx',
      winTitle: 'Nível concluído!', winBody: 'Muito bem.', nextLevel: 'Próximo', keepPlaying: 'Continuar',
      allClearTitle: 'Incrível!', allClearBody: 'Você passou por um grande marco. Existem 30.000.000 de níveis.',
      login: 'Entrar', register: 'Registrar', account: 'Conta', logout: 'Sair',
      emailPlaceholder: 'Seu e-mail', codePlaceholder: 'Código de 6', sendCode: 'Enviar código', verifyPlay: 'Verificar e jogar',
      progressSaved: 'Progresso salvo na sua conta.', progressLoaded: 'Progresso carregado.',
      langLabel: 'Idioma', difficultyLabel: 'Dificuldade',
      easy: 'Fácil', medium: 'Médio', hard: 'Difícil', expert: 'Especialista',
      hint: 'Dica', install: 'Instalar App', settings: 'Configurações', sound: 'Som', volume: 'Volume', tone: 'Tom (Hz)',
      close: 'Fechar', jump: 'Ir ao nível', goTo: 'Ir', signInTitle: 'Entrar', signUpTitle: 'Criar conta',
      sendCodeFirst: 'Digite seu e-mail e enviaremos um código de 6 caracteres.', codeSent: 'Código enviado! Verifique seu e-mail.',
      invalidCode: 'Código incorreto. Tente de novo.', codeExpired: 'Código expirado. Peça um novo.',
      needLogin: 'Entre para sincronizar seu progresso.', playAsGuest: 'Jogar como convidado',
      emailInvalid: 'Digite um e-mail válido.', backToMenu: 'Voltar', thankYou: 'Obrigado por jogar!',
      loading: 'Carregando…', of2: 'de', adLabel: 'Anúncio', startTitle: 'Sokoban', startBody: 'Um quebra-cabeça relaxante. Empurre todas as caixas para o alvo.', best_is: 'Melhor',
      storyTitle: 'História',
      story: 'História', share: 'Compartilhar', linkCopied: 'Link copiado! Envie para seus amigos.',
      iosInstallHint: 'No iPhone/iPad (Safari): toque no botão Compartilhar e depois "Adicionar à Tela de Início" para instalar como app.',
      storyBody: 'História: você é o operador do turno noturno de um sistema de monitoramento de trabalho com IA. Uma falha espalhou as "caixas de tarefas" do sistema pelo armazém — empurre cada caixa de volta ao seu ponto de verificação para que a IA possa observá-las novamente.'
    },
    fr: {
      appTitle: 'Sokoban · Pousse', tagline: 'Pousse toutes les caisses sur la cible. Plus de 30.000.000 de niveaux!',
      start: 'Commencer', resume: 'Continuer', level: 'Niveau', of: 'sur', moves: 'Coups', pushes: 'Poussées',
      best: 'Record', par: 'Objectif', undo: 'Annuler', reset: 'Réinitialiser', prev: 'Préc', next: 'Suiv',
      winTitle: 'Niveau réussi!', winBody: 'Bien joué.', nextLevel: 'Niveau suivant', keepPlaying: 'Continuer',
      allClearTitle: 'Bravo!', allClearBody: 'Vous avez franchi un grand cap. Il y a 30.000.000 de niveaux.',
      login: 'Se connecter', register: "S'inscrire", account: 'Compte', logout: 'Déconnexion',
      emailPlaceholder: 'Votre e-mail', codePlaceholder: 'Code à 6', sendCode: 'Envoyer le code', verifyPlay: 'Vérifier et jouer',
      progressSaved: 'Progrès enregistré sur votre compte.', progressLoaded: 'Progrès chargé.',
      langLabel: 'Langue', difficultyLabel: 'Difficulté',
      easy: 'Facile', medium: 'Moyen', hard: 'Difficile', expert: 'Expert',
      hint: 'Indice', install: 'Installer l\'app', settings: 'Paramètres', sound: 'Son', volume: 'Volume', tone: 'Tonalité (Hz)',
      close: 'Fermer', jump: 'Aller au niveau', goTo: 'Aller', signInTitle: 'Connexion', signUpTitle: 'Créer un compte',
      sendCodeFirst: 'Saisissez votre e-mail, nous enverrons un code de 6 caractères.', codeSent: 'Code envoyé! Vérifiez votre boîte mail.',
      invalidCode: 'Code incorrect. Réessayez.', codeExpired: 'Code expiré. Demandez-en un nouveau.',
      needLogin: 'Connectez-vous pour synchroniser vos progrès.', playAsGuest: 'Jouer en invité',
      emailInvalid: 'Veuillez saisir un e-mail valide.', backToMenu: 'Retour', thankYou: 'Merci d\'avoir joué!',
      loading: 'Chargement…', of2: 'sur', adLabel: 'Publicité', startTitle: 'Sokoban', startBody: 'Un casse-tête relaxant. Poussez toutes les caisses sur la cible.', best_is: 'Record',
      storyTitle: 'Histoire',
      story: 'Histoire', share: 'Partager', linkCopied: 'Lien copié ! Envoyez-le à vos amis.',
      iosInstallHint: 'Sur iPhone/iPad (Safari) : appuyez sur le bouton Partager, puis « Sur l\'écran d\'accueil » pour l\'installer comme app.',
      storyBody: 'Histoire : vous êtes l\'opérateur de nuit d\'un système de surveillance du travail par IA. Un bug a éparpillé les « caisses de tâches » du système dans l\'entrepôt — poussez chaque caisse sur son point de contrôle pour que l\'IA puisse les surveiller à nouveau.'
    },
    de: {
      appTitle: 'Sokoban · Schieben', tagline: 'Schiebe alle Kisten auf das Ziel. Über 30.000.000 Level!',
      start: 'Start', resume: 'Fortsetzen', level: 'Level', of: 'von', moves: 'Züge', pushes: 'Schübe',
      best: 'Beste', par: 'Ziel', undo: 'Rückgängig', reset: 'Zurücksetzen', prev: 'Zurück', next: 'Weiter',
      winTitle: 'Level geschafft!', winBody: 'Gut gemacht.', nextLevel: 'Nächstes', keepPlaying: 'Weiterspielen',
      allClearTitle: 'Hervorragend!', allClearBody: 'Du hast einen großen Meilenstein erreicht. Es gibt 30.000.000 Level.',
      login: 'Anmelden', register: 'Registrieren', account: 'Konto', logout: 'Abmelden',
      emailPlaceholder: 'Deine E-Mail', codePlaceholder: '6-Zeichen-Code', sendCode: 'Code senden', verifyPlay: 'Prüfen & Spielen',
      progressSaved: 'Fortschritt in deinem Konto gespeichert.', progressLoaded: 'Fortschritt geladen.',
      langLabel: 'Sprache', difficultyLabel: 'Schwierigkeit',
      easy: 'Einfach', medium: 'Mittel', hard: 'Schwer', expert: 'Experte',
      hint: 'Hinweis', install: 'App installieren', settings: 'Einstellungen', sound: 'Ton', volume: 'Lautstärke', tone: 'Ton (Hz)',
      close: 'Schließen', jump: 'Zu Level', goTo: 'Gehen', signInTitle: 'Anmelden', signUpTitle: 'Konto erstellen',
      sendCodeFirst: 'Gib deine E-Mail ein, wir senden einen 6-stelligen Code.', codeSent: 'Code gesendet! Bitte Postfach prüfen.',
      invalidCode: 'Falscher Code. Erneut versuchen.', codeExpired: 'Code abgelaufen. Neu anfordern.',
      needLogin: 'Melde dich an, um Fortschritt zu synchro­nisieren.', playAsGuest: 'Als Gast spielen',
      emailInvalid: 'Bitte gültige E-Mail eingeben.', backToMenu: 'Zurück', thankYou: 'Danke fürs Spielen!',
      loading: 'Lädt…', of2: 'von', adLabel: 'Werbung', startTitle: 'Sokoban', startBody: 'Ein entspanntes Puzzle. Schiebe alle Kisten aufs Ziel.', best_is: 'Beste',
      storyTitle: 'Geschichte',
      story: 'Geschichte', share: 'Teilen', linkCopied: 'Link kopiert! Schick ihn an deine Freunde.',
      iosInstallHint: 'Auf iPhone/iPad (Safari): Tippe auf „Teilen“ und dann „Zum Home-Bildschirm“, um es als App zu installieren.',
      storyBody: 'Geschichte: Du bist der Nachtwächter eines KI-Arbeitsüberwachungssystems. Eine Störung hat die „Aufgabenkisten“ des Systems im Lager verstreut — schiebe jede Kiste zurück auf ihren Kontrollpunkt, damit die KI sie wieder beobachten kann.'
    },
    ja: {
      appTitle: '倉庫番 · ボックス押し', tagline: 'すべての箱を目標に押し込もう。3000万以上のステージ！',
      start: '開始', resume: '続ける', level: 'ステージ', of: '/', moves: '手数', pushes: '押した回数',
      best: 'ベスト', par: '目標', undo: '戻す', reset: 'リセット', prev: '前へ', next: '次へ',
      winTitle: 'クリア！', winBody: 'よくできました。', nextLevel: '次のステージ', keepPlaying: '続ける',
      allClearTitle: 'すごい！', allClearBody: '大きな節目を突破しました。3000万ステージあります。',
      login: 'ログイン', register: '登録', account: 'アカウント', logout: 'ログアウト',
      emailPlaceholder: 'メールアドレス', codePlaceholder: '6文字のコード', sendCode: 'コード送信', verifyPlay: '認証して開始',
      progressSaved: '進捗をアカウントに保存しました。', progressLoaded: '進捗を読み込みました。',
      langLabel: '言語', difficultyLabel: '難易度',
      easy: '簡単', medium: '普通', hard: '難しい', expert: 'エキスパート',
      hint: 'ヒント', install: 'アプリをインストール', settings: '設定', sound: '音', volume: '音量', tone: '音色(Hz)',
      close: '閉じる', jump: 'ステージへ', goTo: '移動', signInTitle: 'ログイン', signUpTitle: 'アカウント作成',
      sendCodeFirst: 'メールを入力すると、6文字のコードを送信します。', codeSent: 'コードを送信しました！受信箱を確認してください。',
      invalidCode: 'コードが違います。もう一度。', codeExpired: 'コードの有効期限切れ。再取得してください。',
      needLogin: 'ログインすると複数端末で進捗を同期できます。', playAsGuest: 'ゲストで遊ぶ',
      emailInvalid: '有効なメールを入力してください。', backToMenu: '戻る', thankYou: '遊んでくれてありがとう！',
      loading: '読み込み中…', of2: '/', adLabel: '広告', startTitle: '倉庫番', startBody: 'リラックスできるパズル。すべての箱を目標に押し込みます。', best_is: 'ベスト',
      storyTitle: 'ストーリー',
      story: 'ストーリー', share: '共有', linkCopied: 'リンクをコピーしました！友達に送ってください。',
      iosInstallHint: 'iPhone/iPad（Safari）：「共有」ボタンをタップし、「ホーム画面に追加」でアプリとしてインストールできます。',
      storyBody: 'ストーリー：あなたはAI作業監視システムの夜勤オペレーターです。不具合でシステムの「作業クレート」が倉庫に散らばってしまいました。すべてのクレートを監視ポイントに戻し、AIが再び作業を見守れるようにしてください。'
    },
    ko: {
      appTitle: '소코반 · 박스 밀기', tagline: '모든 상자를 목표로 밀어 넣으세요. 3,000만 개 이상의 스테이지!',
      start: '시작', resume: '계속', level: '스테이지', of: '/', moves: '이동', pushes: '민 횟수',
      best: '최고', par: '목표', undo: '되돌리기', reset: '초기화', prev: '이전', next: '다음',
      winTitle: '클리어!', winBody: '잘했어요.', nextLevel: '다음 스테이지', keepPlaying: '계속하기',
      allClearTitle: '대단해요!', allClearBody: '큰 이정표를 넘었습니다. 3,000만 스테이지가 있습니다.',
      login: '로그인', register: '가입', account: '계정', logout: '로그아웃',
      emailPlaceholder: '이메일', codePlaceholder: '6자 코드', sendCode: '코드 전송', verifyPlay: '인증하고 시작',
      progressSaved: '진행 상황을 계정에 저장했습니다.', progressLoaded: '진행 상황을 불러왔습니다.',
      langLabel: '언어', difficultyLabel: '난이도',
      easy: '쉬움', medium: '보통', hard: '어려움', expert: '전문가',
      hint: '힌트', install: '앱 설치', settings: '설정', sound: '소리', volume: '볼륨', tone: '음색(Hz)',
      close: '닫기', jump: '스테이지로', goTo: '이동', signInTitle: '로그인', signUpTitle: '계정 만들기',
      sendCodeFirst: '이메일을 입력하면 6자 코드를 보냅니다.', codeSent: '코드를 보냈습니다! 받은편지를 확인하세요.',
      invalidCode: '코드가 틀렸습니다. 다시 시도하세요.', codeExpired: '코드가 만료되었습니다. 새로 받으세요.',
      needLogin: '로그인하면 기기 간 진행 상황을 동기화할 수 있습니다.', playAsGuest: '게스트로 놀기',
      emailInvalid: '유효한 이메일을 입력하세요.', backToMenu: '돌아가기', thankYou: '플레이해 주셔서 감사합니다!',
      loading: '불러오는 중…', of2: '/', adLabel: '광고', startTitle: '소코반', startBody: '편안한 퍼즐. 모든 상자를 목표로 밀어 넣으세요.', best_is: '최고',
      storyTitle: '스토리',
      story: '스토리', share: '공유', linkCopied: '링크가 복사되었습니다! 친구에게 보내세요.',
      iosInstallHint: 'iPhone/iPad(Safari): 공유 버튼을 누르고 "홈 화면에 추가"를 선택하면 앱으로 설치할 수 있습니다.',
      storyBody: '스토리: 당신은 AI 작업 모니터링 시스템의 야간 근무자입니다. 오류로 시스템의 "작업 상자"가 창고에 흩어졌습니다. 모든 상자를 감시 지점으로 밀어 AI가 다시 작업을 지켜볼 수 있게 하세요.'
    },
    ru: {
      appTitle: 'Сокобан · Толкай', tagline: 'Закати все ящики на цель. Более 30.000.000 уровней!',
      start: 'Старт', resume: 'Продолжить', level: 'Уровень', of: 'из', moves: 'Шаги', pushes: 'Толчки',
      best: 'Лучший', par: 'Цель', undo: 'Отмена', reset: 'Сброс', prev: 'Назад', next: 'Далее',
      winTitle: 'Уровень пройден!', winBody: 'Отлично.', nextLevel: 'Следующий', keepPlaying: 'Продолжить',
      allClearTitle: 'Великолепно!', allClearBody: 'Вы преодолели большой рубеж. Всего 30.000.000 уровней.',
      login: 'Войти', register: 'Регистрация', account: 'Аккаунт', logout: 'Выйти',
      emailPlaceholder: 'Ваш e-mail', codePlaceholder: 'Код из 6', sendCode: 'Отправить код', verifyPlay: 'Проверить и играть',
      progressSaved: 'Прогресс сохранён в аккаунте.', progressLoaded: 'Прогресс загружен.',
      langLabel: 'Язык', difficultyLabel: 'Сложность',
      easy: 'Легко', medium: 'Средне', hard: 'Сложно', expert: 'Эксперт',
      hint: 'Подсказка', install: 'Установить приложение', settings: 'Настройки', sound: 'Звук', volume: 'Громкость', tone: 'Тон (Гц)',
      close: 'Закрыть', jump: 'К уровню', goTo: 'Идти', signInTitle: 'Вход', signUpTitle: 'Создать аккаунт',
      sendCodeFirst: 'Введите e-mail, мы вышлем код из 6 символов.', codeSent: 'Код отправлен! Проверьте почту.',
      invalidCode: 'Неверный код. Попробуйте снова.', codeExpired: 'Код истёк. Запросите новый.',
      needLogin: 'Войдите, чтобы синхронизировать прогресс.', playAsGuest: 'Играть как гость',
      emailInvalid: 'Введите корректный e-mail.', backToMenu: 'Назад', thankYou: 'Спасибо за игру!',
      loading: 'Загрузка…', of2: 'из', adLabel: 'Реклама', startTitle: 'Сокобан', startBody: 'Расслабляющая головоломка. Закатите все ящики на цель.', best_is: 'Лучший',
      storyTitle: 'Сюжет',
      story: 'Сюжет', share: 'Поделиться', linkCopied: 'Ссылка скопирована! Отправьте её друзьям.',
      iosInstallHint: 'На iPhone/iPad (Safari): нажмите «Поделиться», затем «На экран „Домой“», чтобы установить как приложение.',
      storyBody: 'Сюжет: вы — ночной оператор системы ИИ-мониторинга работы. Сбой разбросал «рабочие ящики» системы по складу — втолкните каждый ящик обратно на его контрольную точку, чтобы ИИ снова мог за ними следить.'
    },
    ar: {
      appTitle: 'سوكوبان · ادفع', tagline: 'ادفع كل الصناديق إلى الهدف. أكثر من 30.000.000 مستوى!',
      start: 'ابدأ', resume: 'متابعة', level: 'المستوى', of: 'من', moves: 'خطوات', pushes: 'دفعات',
      best: 'الأفضل', par: 'الهدف', undo: 'تراجع', reset: 'إعادة', prev: 'السابق', next: 'التالي',
      winTitle: 'أحسنت!', winBody: 'عمل رائع.', nextLevel: 'المستوى التالي', keepPlaying: 'متابعة اللعب',
      allClearTitle: 'مذهل!', allClearBody: 'لقد تجاوزت مرحلة كبرى. هناك 30.000.000 مستوى.',
      login: 'تسجيل الدخول', register: 'إنشاء حساب', account: 'الحساب', logout: 'تسجيل الخروج',
      emailPlaceholder: 'بريدك الإلكتروني', codePlaceholder: 'رمز 6 أحرف', sendCode: 'إرسال الرمز', verifyPlay: 'تحقق والعب',
      progressSaved: 'تم حفظ التقدم في حسابك.', progressLoaded: 'تم تحميل التقدم.',
      langLabel: 'اللغة', difficultyLabel: 'الصعوبة',
      easy: 'سهل', medium: 'متوسط', hard: 'صعب', expert: 'خبير',
      hint: 'تلميح', install: 'تثبيت التطبيق', settings: 'الإعدادات', sound: 'الصوت', volume: 'مستوى الصوت', tone: 'النغمة (هرتز)',
      close: 'إغلاق', jump: 'اذهب للمستوى', goTo: 'اذهب', signInTitle: 'تسجيل الدخول', signUpTitle: 'إنشاء حساب',
      sendCodeFirst: 'أدخل بريدك وسنرسل رمزاً من 6 أحرف.', codeSent: 'تم إرسال الرمز! تحقق من بريدك.',
      invalidCode: 'رمز خاطئ. حاول مجدداً.', codeExpired: 'انتهت صلاحية الرمز. اطلب جديداً.',
      needLogin: 'سجّل الدخول لمزامنة تقدمك.', playAsGuest: 'العب كضيف',
      emailInvalid: 'أدخل بريداً صالحاً.', backToMenu: 'رجوع', thankYou: 'شكراً للعب!',
      loading: 'جارٍ التحميل…', of2: 'من', adLabel: 'إعلان', startTitle: 'سوكوبان', startBody: 'لغز مريح. ادفع كل الصناديق إلى الهدف.', best_is: 'الأفضل',
      storyTitle: 'القصة',
      story: 'القصة', share: 'مشاركة', linkCopied: 'تم نسخ الرابط! أرسله لأصدقائك.',
      iosInstallHint: 'على iPhone/iPad (Safari): اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية" للتثبيت كتطبيق.',
      storyBody: 'القصة: أنت مشغل الليل في نظام مراقبة العمل بالذكاء الاصطناعي. نشر خلل "صناديق المهام" في المستودع — ادفع كل صندوق إلى نقطة المراقبة الخاصة به ليتمكن الذكاء الاصطناعي من مراقبتها من جديد.'
    }
  };

  // 所有语言的"关数"统一替换为完整大数字（3万万亿 = 30,000,000,000,000,000），保证成就感到位
  const FULL = '30,000,000,000,000,000';
  for (const lang of Object.keys(D)) {
    for (const key of ['tagline', 'allClearBody']) {
      const s = D[lang][key];
      if (typeof s === 'string') {
        D[lang][key] = s
          .replace(/30\s*[.,]\s*000\s*[.,]\s*000(?!\d)/g, FULL)
          .replace(/3000\s*万/g, FULL)
          .replace(/3,000\s*만/g, FULL);
      }
    }
  }

  const STORAGE_KEY = 'soko_lang';
  function detectLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && D[saved]) return saved;
    const nav = (navigator.language || 'en').toLowerCase();
    if (D[nav]) return nav;
    const base = nav.split('-')[0];
    if (D[base]) return base;
    // 在支持列表里找一个匹配前缀
    for (const l of LANGS) { if (l.code.split('-')[0] === base) return l.code; }
    return 'en';
  }
  let current = detectLang();
  // 初始加载即同步 <html lang> 与方向（阿拉伯语等 RTL）；面向海外，兜底恒为英语
  if (typeof document !== 'undefined') {
    const l0 = LANGS.find(x => x.code === current);
    document.documentElement.lang = current;
    document.documentElement.dir = (l0 && l0.rtl) ? 'rtl' : 'ltr';
  }

  function t(key) {
    const dict = D[current] || D.en;
    if (dict[key] != null) return dict[key];
    return D.en[key] != null ? D.en[key] : key;
  }
  function setLang(code) {
    if (!D[code]) return;
    current = code;
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
    const rtl = LANGS.find(l => l.code === code);
    document.documentElement.lang = code;
    document.documentElement.dir = (rtl && rtl.rtl) ? 'rtl' : 'ltr';
  }
  function isRTL() { const l = LANGS.find(x => x.code === current); return !!(l && l.rtl); }

  const API = { LANGS, D, t, setLang, detectLang, get current() { return current; }, isRTL };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.I18N = API;
})(typeof window !== 'undefined' ? window : this);
