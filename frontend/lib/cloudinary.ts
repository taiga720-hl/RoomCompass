//* Cloudinaryに画像をアップロードして、公開URLを取得する関数
export async function getCloudinaryUrl(file: File): Promise<string> {
    //? process：Node.jsが提供するオブジェクトで、今動いてるプログラムの情報が入ってる
    //? env：環境変数を取得する
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    //? FormData：ファイルを送る時につかうデータ形式
    const formData = new FormData();
    formData.append("file", file);
    //? uploadPreset ?? ""：uploadPresetがnullの場合は空文字使用
    formData.append("upload_preset", uploadPreset ?? "");

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
            method: "POST",
            body: formData,
        },
    );

    if (!res.ok) {
        throw new Error("画像のアップロードに失敗しました");
    }

    const data = await res.json();

    //? secure_url：アップロードされた画像の公開URL
    return data.secure_url;
}