// dma_system_tb.sv
// Full system testbench for the DMA controller
module dma_system_tb;
    reg clk, rst_n;
    reg [3:0] channel_start;
    reg [31:0] cfg_data;
    reg [1:0] cfg_channel_select;
    wire [3:0] channel_busy, channel_done;

    main_dma_controller dut (.*);

    initial begin
        clk = 0; forever #5 clk = ~clk;
    end

    initial begin
        rst_n = 0; 
        channel_start = 0;
        cfg_data = 32'hdeadbeef;
        cfg_channel_select = 2'b00;
        
        #20 rst_n = 1;
        
        // Trigger multiple channels
        #10 channel_start = 4'b1101;
        #20 channel_start = 4'b0000;
        
        wait(channel_done[0]);
        wait(&channel_done);
        
        $display("All channels completed!");
        #100 $finish;
    end
endmodule
