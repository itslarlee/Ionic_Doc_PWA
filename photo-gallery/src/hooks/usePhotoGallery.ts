import { useState, useEffect } from "react";
import { useCamera } from '@ionic/react-hooks/camera';
import { useFilesystem, base64FromPath } from '@ionic/react-hooks/filesystem';
import { useStorage } from '@ionic/react-hooks/storage';
import { isPlatform } from '@ionic/react';
import { CameraResultType, CameraSource, CameraPhoto, Capacitor, FilesystemDirectory } from "@capacitor/core";
import { read } from "fs";


const PHOTO_STORAGE = "photos";
export function usePhotoGallery(){
    
    const { deleteFile, getUri, readFile, writeFile } = useFilesystem();
    const { getPhoto } = useCamera();
    const [photos, setPhotos] = useState<Photo[]>([]); //Aqui es un array de objetos(Tipo Photo)
    const {get, set} = useStorage();


    const savePicture = async (photo: CameraPhoto, fileName: string): Promise<Photo> => {
        let base64Data: string;

        if(isPlatform('hybrid')){
            const file = await readFile({
                path:photo.path!
            });
            base64Data = file.data;
        } else {
            base64Data = await base64FromPath(photo.webPath!);
        }

        const savedFile = await writeFile({
            path: fileName,
            data: base64Data,
            directory: FilesystemDirectory.Data
        });
    
        if(isPlatform('hybrid')){
            //Display the new image by rewriting the 'file://' path to http
            // Details: https://ionicframework.com/docs/building/webview#file-protocol
            return{
                filepath: savedFile.uri,
                webviewPath: Capacitor.convertFileSrc(savedFile.uri),
            };
        }
        else{
            
            // Use webPath to display the new image instead of base64 since it's
            // already loaded into memory
            return {
                filepath: fileName,
                webviewPath: photo.webPath
            };

        }
    };

    useEffect(() =>{
        const loadSaved = async () => {
            const photosString = await get('photos');
            const photosInStorage = (photosString ? JSON.parse(photosString) : []) as Photo[]; 
            // If running on the web ...
            if(!isPlatform('hybrid')){
                for (let photo of photos) {
                    const file = await readFile({
                        path: photo.filepath,
                        directory: FilesystemDirectory.Data
                    });
                    // Web platform only: Load photo as base64 data
                    photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
                }
            }
            setPhotos(photosInStorage);
        };
        loadSaved();
    }, [get, readFile]);
    

    const takePhoto = async () => {
        const  cameraPhoto = await getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100
        });

        const fileName = new Date().getTime() + '.jpeg';
        const savedFileImage = await savePicture(cameraPhoto, fileName);
        const newPhotos = [savedFileImage, ...photos];
        setPhotos(newPhotos)

        set(PHOTO_STORAGE, JSON.stringify(newPhotos));

    };

    

    return {
        photos,
        takePhoto
      };

}





export interface Photo {
    filepath: string;
    webviewPath?: string;
    base64?: string;
}