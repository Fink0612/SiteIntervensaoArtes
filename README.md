# Sempre Observados

Site da intervenção artística sobre privacidade, vigilância e rastros digitais.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie todos os arquivos deste projeto.
2. No repositório, abra **Settings → Pages**.
3. Em **Source**, selecione **GitHub Actions**.
4. O processo **Publicar site no GitHub Pages** será executado automaticamente.
5. Ao terminar, o endereço aparecerá na página do processo e em **Settings → Pages**.

A versão publicada pelo GitHub está na pasta `docs` e não precisa de instalação,
banco de dados ou servidor. Ela também não usa cookies nem coleta dados pessoais.

Depois de obter o endereço público, gere o QR code apontando exatamente para ele.

## Ver no computador

Abra `docs/index.html` em um navegador. Para editar o texto ou a estrutura da versão
estática, altere `docs/index.html`; os estilos estão em `docs/styles.css`.

## Arquivos principais

- `docs/index.html`: página pronta para o GitHub Pages.
- `docs/styles.css`: visual, animações e adaptação para celular.
- `docs/og.png`: imagem usada quando o link é compartilhado.
- `.github/workflows/pages.yml`: publicação automática.
- `app`: versão usada para desenvolvimento e pré-visualização.
