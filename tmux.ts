import { $ } from "bun";
import os from "os";

const stdin = async (
  prompt_text: string,
  callback: (line: string) => string | undefined
): Promise<string> => {
  while (true) {
    const value = (prompt(prompt_text) ?? "")
      .trim()
      .replaceAll(" ", "_")
      .replaceAll('"', "");

    const result = callback(value);
    if (result) return result;

    console.log(`Некорректный ввод!`);
  }
};

export class Tmux {
  static command(strs: string[]): {
    text: string;
    success: boolean;
  } {
    const { stderr, stdout, success } = Bun.spawnSync(strs);
    const text = stdout.toString() || stderr.toString();

    return { text, success };
  }

  static getSessionContent(name: string): string {
    const { text } = Tmux.command(["tmux", "capture-pane", "-p", "-t", name]);
    return text;
  }

  static hosts(): string[] {
    try {
      const { text } = Tmux.command(["cat", `${os.homedir()}/.ssh/config`]);
      return text
        .split("\n")
        .filter((host) => host.includes("Host "))
        .filter((h) => !h.trim().startsWith("#"))
        .map((host) => host.split(" ")[1]);
    } catch (error: any) {
      if (error.message == "No such file or directory") {
        console.log("Нет хостов и папки, содание ~/.ssh/config");
        const { success } = Tmux.command([
          "touch",
          `${os.homedir()}/.ssh/config`,
        ]);
        console.log("Создание", success);

        const { success: s2 } = Tmux.command([
          "chmod",
          "600",
          `${os.homedir()}/.ssh/config`,
        ]);

        console.log("chmod 600: ", s2);
        return [];
      }
      console.log("Не удалось получить список hosts");
      return [];
    }
  }

  static ls(): string[] {
    const { text } = Tmux.command(["tmux", "ls"]);

    if (text.startsWith("no server running")) {
      return [];
    }

    return text
      .split("\n")
      .map((tmux) => (tmux.trim() ? tmux.split(" ")[0].slice(0, -1) : ""))
      .filter((t) => t.trim());
  }

  static async newSession(command: string, name: string): Promise<void> {
    if (Tmux.hasSession(name)) {
      console.log("Сессия с таким именем уже существует");
      return;
    }

    const sessionName = name ?? `temp-${Date.now()}`;
    Tmux.command(["tmux", "new-session", "-d", "-s", sessionName]);

    // Отправка команды ssh в сессию tmux
    const { success } = Tmux.command([
      "tmux",
      "send-keys",
      "-t",
      sessionName,
      command,
      "C-m", // Эмуляция нажатия Enter
    ]);

    const t = Tmux.getSessionContent(sessionName);
    if (t.includes("Connection refused")) {
      console.log("Не удалось подключиться");
      Tmux.command(["tmux", "kill-session", "-t", sessionName]);
    }

    console.log(success ? "Сессия создана" : "Ошибка создания сессии");
  }

  static hasSession(name: string): boolean {
    return Tmux.ls().includes(name);
  }

  static async closeSession(name: string): Promise<void> {
    const session = await Tmux.findHost(name);

    if (!session) {
      console.log("Сессия не найдена");
      return;
    }

    const { success } = Tmux.command(["tmux", "kill-session", "-t", session!]);
    console.log(
      success ? `Сессия ${session!} закрыта` : "Ошибка закрытия сессии"
    );
  }

  static async tunnel(
    host: string,
    port: string | number,
    isLocal = true
  ): Promise<void> {
    await Tmux.newSession(
      `ssh -${
        isLocal ? "L" : "R"
      } ${port}:localhost:${port} ${host} -o ServerAliveInterval=60 -o ServerAliveCountMax=2`,
      `${host}-${port}`
    );
  }

  static async findSessions(name: string): Promise<string[] | null> {
    let sessions = Tmux.ls();

    if (sessions.length === 0) {
      return null;
    }

    let session;
    if (!Number.isNaN(+name)) {
      session = sessions[+name - 1];
      if (session) return [session];
    }

    sessions = sessions.filter((p) => p.includes(name));

    if (sessions.length) {
      return sessions;
    }

    return null;
  }

  static async findSession(name: string): Promise<string | null> {
    let sessions = await Tmux.findSessions(name);

    if (!sessions) return null;
    if (sessions.length == 1) return sessions[0];

    console.log("Найдено несколько сессий с таким именем:");
    console.log(sessions.map((s, i) => `${i + 1}) ${s}`).join("\n"));

    process.stdout.write("\nВыберите нужную сессию: ");

    for await (const line of console) {
      const value = line.trim();

      if (sessions[+value - 1]) {
        return sessions[+value - 1];
      }
      console.log("Некорректный ввод!");
      process.stdout.write("\nВыберите нужную сессию: ");
    }

    return null;
  }

  static async findHosts(name: string): Promise<string[] | null> {
    let hosts = Tmux.hosts();

    if (hosts.length === 0) {
      return null;
    }

    let host;
    if (!Number.isNaN(+name)) {
      host = hosts[+name - 1];
      if (host) return [host];
    }

    hosts = hosts.filter((p) => p.includes(name));

    if (hosts.length) {
      return hosts;
    }

    return null;
  }

  static async findHost(name: string): Promise<string | null> {
    let hosts = await Tmux.findHosts(name);

    if (!hosts) return null;
    if (hosts.length == 1) return hosts[0];

    console.log("Найдено несколько сессий с таким именем:");
    console.log(hosts.map((s, i) => `${i + 1}) ${s}`).join("\n"));

    process.stdout.write("\nВыберите нужный хост: ");

    for await (const line of console) {
      const value = line.trim();

      if (hosts[+value - 1]) {
        return hosts[+value - 1];
      }
      console.log("Некорректный ввод!");
      process.stdout.write("\nВыберите нужный хост: ");
    }

    return null;
  }

  static async add(): Promise<void> {
    const hosts = Tmux.hosts();

    const echo2 = await $`whoami`;

    const echo = await $`echo "\n\nHost kaidstor\n\tHostName 109.68.212.83\n\tIdentityFile ~/.ssh/easy\n\tUser root\n" >>" ${os.homedir()}/.ssh/config`;

    // console.log(
    //   success
    //     ? "Добавлена запись в ~/.ssh/config"
    //     : "Ошибка добавления записи в ~/.ssh/config"
    // );

    const { text } = Tmux.command(["ls", `${os.homedir()}/.ssh`]);
    const keys = text.split("\n").filter((p) => p.trim() && !p.includes("."));

    if (!keys.length) {
      console.log("Нет ключей доступа в ~/.ssh");
      return;
    }

    const host = await stdin("\nВведите название хоста: ", (h) => {
      if (!hosts?.filter((p) => p == h).length) return h;
    });

    console.log("Ключи доступа из ~/.ssh:");
    console.log(keys.map((k, i) => `${i + 1}) ${k}`).join("\n"));

    const key = await stdin("\nВыберите ключ: ", (key) => {
      return keys[+key - 1];
    });

    const user = await stdin("\nВыберите ключ: ", (key) => key);

    console.log(host!);
    console.log(key!);

    const result = $`echo "\n\nHost kaidstor
    HostName 109.68.212.83
    IdentityFile ~/.ssh/easy
    User root\n" >> ~/.bashrc`;
  }
}
