param (
    [string]$ImagePath
)

try {
    # Set encoding to UTF-8
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

    # Load assembly
    [void][System.Reflection.Assembly]::Load("System.Runtime.WindowsRuntime, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089")
    
    # Load WinRT types
    $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
    $null = [Windows.Storage.FileAccessMode, Windows.Storage, ContentType=WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime]
    $null = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType=WindowsRuntime]

    # Helper function to await WinRT Async operations using reflection
    function Await-Operation ($asyncOp, [Type]$resultType) {
        $extType = [System.WindowsRuntimeSystemExtensions]
        $methods = $extType.GetMethods()
        $asTaskMethod = $null
        foreach ($m in $methods) {
            if ($m.Name -eq "AsTask" -and $m.IsGenericMethod) {
                $params = $m.GetParameters()
                if ($params.Count -eq 1 -and $params[0].ParameterType.Name -like "IAsyncOperation*") {
                    $asTaskMethod = $m
                    break
                }
            }
        }
        if ($asTaskMethod -eq $null) {
            throw "AsTask method not found in System.WindowsRuntimeSystemExtensions!"
        }
        
        $genericMethod = $asTaskMethod.MakeGenericMethod($resultType)
        $task = $genericMethod.Invoke($null, @($asyncOp))
        
        # Wait for task
        while (-not $task.IsCompleted) {
            Start-Sleep -Milliseconds 10
        }
        if ($task.IsFaulted) {
            throw $task.Exception.InnerException
        }
        return $task.Result
    }

    # 1. Get file
    $fileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath)
    $file = Await-Operation $fileOp ([Windows.Storage.StorageFile])

    # 2. Open stream
    $streamOp = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    $stream = Await-Operation $streamOp ([Windows.Storage.Streams.IRandomAccessStream])
    
    # 3. Create decoder
    $decoderOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
    $decoder = Await-Operation $decoderOp ([Windows.Graphics.Imaging.BitmapDecoder])

    # 4. Get SoftwareBitmap
    $bitmapOp = $decoder.GetSoftwareBitmapAsync()
    $bitmap = Await-Operation $bitmapOp ([Windows.Graphics.Imaging.SoftwareBitmap])

    # 5. Create OCR engine
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if ($engine -eq $null) {
        throw "OCR Engine could not be created. Please check if Windows OCR language is installed."
    }
    
    # 6. Run OCR
    $resultOp = $engine.RecognizeAsync($bitmap)
    $result = Await-Operation $resultOp ([Windows.Media.Ocr.OcrResult])
    
    # Output the text
    Write-Output $result.Text
} catch {
    Write-Error "OCR execution failed: $_"
    exit 1
}
