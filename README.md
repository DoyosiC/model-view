# 3D Turntable

[![Viewer checks](https://github.com/DoyosiC/model-view/actions/workflows/ci.yml/badge.svg)](https://github.com/DoyosiC/model-view/actions/workflows/ci.yml)

ブラウザだけで3Dモデルを確認できる、軽量なローカルビューアです。モデルを自動回転させながら、マウス操作で視点を変更したり、モデルの寸法を確認したりできます。

## Demo

このリポジトリをGitHub Pagesなどの静的ホスティングへ配置すると、そのままブラウザで起動できます。Three.jsはCDNから読み込みます。

## Features

- OBJ、PLY、GLB、GLTF、STL、DAEを読み込み
- OBJのMTL・テクスチャ、GLTFのBIN・画像を同時選択して表示
- ローカルファイルのドラッグ＆ドロップに対応
- URLからモデルを読み込み
- 自動回転の再生・停止、速度、回転軸の変更
- モデルのバウンディングボックス寸法を表示
- ダーク／ライト表示の切り替え
- 読み込んだモデルを外部サーバーへアップロードしないクライアントサイド処理

## Quick start

### Docker

```bash
docker compose up --build
```

ブラウザで <http://127.0.0.1:8080/> を開きます。ポートを変更する場合は、例えば次のように実行します。

```bash
VIEWER_PORT=8081 docker compose up --build
```

停止する場合:

```bash
docker compose down
```

### Python

Python 3があれば、開発用の簡易サーバーで起動できます。

```bash
python server.py
```

ブラウザで <http://127.0.0.1:8080/> を開きます。

## Usage

1. 「3Dファイルを選択」をクリックするか、ファイルをドロップします。
2. テクスチャ付きOBJはOBJ、MTL、テクスチャ画像をまとめて選択します。
3. 必要に応じて自動回転の速度・軸を変更します。
4. 外部URLを使用する場合は、URL欄へモデルのURLを入力します。配信元がCORSを許可している必要があります。

## Tech stack

- HTML / CSS / JavaScript
- [Three.js](https://threejs.org/)
- Python `http.server`（開発用）
- Nginx / Docker Compose（コンテナ実行用）

## Notes

- モデルデータはブラウザ内で処理され、アプリから外部へアップロードされません。
- URL読み込みは、対象サーバーのCORS設定やファイル構成に依存します。
- Three.jsはjsDelivr CDNから取得するため、初回表示時にインターネット接続が必要です。
- 大きなモデルや高解像度テクスチャは、ブラウザのメモリ使用量が増える場合があります。

## Development checks

GitHub ActionsでPythonサーバーとJavaScriptの構文を確認しています。

## License

MIT License. 詳細は [LICENSE](LICENSE) を参照してください。
